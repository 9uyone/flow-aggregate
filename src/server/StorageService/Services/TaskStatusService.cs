using Common.Constants;
using Common.Contracts;
using Common.Contracts.Events;
using Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Microsoft.Extensions.Caching.Distributed;
using MongoDB.Driver;
using StackExchange.Redis;
using StorageService.Contracts;
using StorageService.Entities;
using System.Text.Json;

namespace StorageService.Services;

internal class TaskStatusService(
	IMongoDatabase mongoDatabase,
	IConnectionMultiplexer redis,
	IDistributedCache cache)
{
	public async Task<PagedResponse<TaskStatusDto>> GetTasksAsync(
		Guid userId,
		int? page,
		int? pageSize,
		bool? oldFirst,
		string? status,
		string? parserSlug,
		string? correlationId,
		DateTime? from,
		DateTime? to)
	{
		if (!TryParseStatus(status, out var statusFilter))
			throw new BadRequestException("Invalid status. Allowed values: Running, Success, Failed");

		var allTasks = new List<TaskStatusDto>();

		var runningTasks = await GetRunningTasksAsync(userId);
		allTasks.AddRange(runningTasks);

		var logsCollection = mongoDatabase.GetCollection<ExecutionLog>(MongoCollections.ExecutionLogs);
		var completedLogs = await logsCollection.Find(x => x.UserId == userId && x.CorrelationId != null).ToListAsync();
		allTasks.AddRange(completedLogs.Select(log => new TaskStatusDto {
			CorrelationId = log.CorrelationId!.Value,
			ParserSlug = log.ParserSlug,
			Status = log.Status.ToString(),
			ErrorMessage = log.ErrorMessage,
			StartedAt = log.StartedAt,
			FinishedAt = log.FinishedAt,
		}));

		var filteredTasks = allTasks
			.Where(task => MatchesStatus(task, statusFilter))
			.Where(task => MatchesFrom(task, from))
			.Where(task => MatchesTo(task, to))
			.Where(task => MatchesParserSlug(task, parserSlug))
			.Where(task => MatchesCorrelationId(task, correlationId));

		var sortedTasks = oldFirst == true
			? filteredTasks.OrderBy(x => x.StartedAt)
			: filteredTasks.OrderByDescending(x => x.StartedAt);

		var filteredList = sortedTasks.ToList();
		var totalCount = filteredList.Count;

		var actualPage = Math.Max(page ?? 1, 1);
		var actualPageSize = PagedExtensions.GetActualPageSize(pageSize);
		var skip = (actualPage - 1) * actualPageSize;
		var pagedItems = filteredList.Skip(skip).Take(actualPageSize).ToList();

		var correlationIds = pagedItems.Select(x => x.CorrelationId).Distinct().ToList();
		var recordsCountByCorrelationId = await GetRecordsCountByCorrelationIdAsync(userId, correlationIds);
		foreach (var task in pagedItems) {
			task.RecordsCount = recordsCountByCorrelationId.GetValueOrDefault(task.CorrelationId, 0);
		}

		return pagedItems.ToPagedResponse(totalCount, actualPage, actualPageSize);
	}

	private static bool MatchesStatus(TaskStatusDto task, ExecutionStatus? statusFilter) {
		if (statusFilter is null)
			return true;

		return string.Equals(task.Status, statusFilter.Value.ToString(), StringComparison.OrdinalIgnoreCase);
	}

	private static bool MatchesFrom(TaskStatusDto task, DateTime? from) {
		if (from is null)
			return true;

		return task.StartedAt is not null && task.StartedAt >= from;
	}

	private static bool MatchesTo(TaskStatusDto task, DateTime? to) {
		if (to is null)
			return true;

		return task.StartedAt is not null && task.StartedAt <= to;
	}

	private static bool MatchesParserSlug(TaskStatusDto task, string? parserSlug) {
		if (string.IsNullOrWhiteSpace(parserSlug))
			return true;

		return !string.IsNullOrWhiteSpace(task.ParserSlug)
			&& task.ParserSlug.Contains(parserSlug, StringComparison.OrdinalIgnoreCase);
	}

	private static bool MatchesCorrelationId(TaskStatusDto task, string? correlationId) {
		if (string.IsNullOrWhiteSpace(correlationId))
			return true;

		return task.CorrelationId.ToString().Contains(correlationId, StringComparison.OrdinalIgnoreCase);
	}

	private async Task<List<TaskStatusDto>> GetRunningTasksAsync(Guid userId) {
		var redisDb = redis.GetDatabase();
		var pendingSetKey = $"running_tasks:{userId}";
		var pendingCorrelationIds = await redisDb.SetMembersAsync(pendingSetKey);
		var runningTasks = new List<TaskStatusDto>();

		foreach (var memberId in pendingCorrelationIds) {
			if (!Guid.TryParse(memberId.ToString(), out var correlationGuid))
				continue;

			var statusRaw = await cache.GetStringAsync($"task_status:{correlationGuid}");
			if (statusRaw == null)
				continue;

			runningTasks.Add(ToTaskStatusDtoFromCache(correlationGuid, statusRaw));
		}

		return runningTasks;
	}

	private async Task<Dictionary<Guid, int>> GetRecordsCountByCorrelationIdAsync(
		Guid userId,
		IReadOnlyCollection<Guid> correlationIds) {
		if (correlationIds.Count == 0)
			return new Dictionary<Guid, int>();

		var dataCollection = mongoDatabase.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var filter = Builders<DataCollectedEvent>.Filter.And(
			Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId),
			Builders<DataCollectedEvent>.Filter.In(x => x.CorrelationId, correlationIds.Select(x => (Guid?)x)));

		var counts = await dataCollection.Aggregate()
			.Match(filter)
			.Group(x => x.CorrelationId, g => new CorrelationRecordsCount {
				CorrelationId = g.Key,
				RecordsCount = g.Count()
			})
			.ToListAsync();

		return counts
			.Where(x => x.CorrelationId is not null)
			.ToDictionary(x => x.CorrelationId!.Value, x => x.RecordsCount);
	}

	private static bool TryParseStatus(string? status, out ExecutionStatus? parsedStatus) {
		parsedStatus = null;
		if (string.IsNullOrWhiteSpace(status))
			return true;

		if (!Enum.TryParse<ExecutionStatus>(status, true, out var value))
			return false;

		parsedStatus = value;
		return true;
	}

	private static TaskStatusDto ToTaskStatusDtoFromCache(Guid correlationId, string statusRaw) {
		try {
			var cacheStatus = JsonSerializer.Deserialize<TaskStatusCacheItem>(statusRaw);
			if (cacheStatus != null) {
				return new TaskStatusDto {
					CorrelationId = correlationId,
					ParserSlug = cacheStatus.ParserSlug,
					Status = cacheStatus.Status,
					StartedAt = cacheStatus.StartedAt,
					FinishedAt = null
				};
			}
		}
		catch (JsonException) {
		}

		return new TaskStatusDto {
			CorrelationId = correlationId,
			Status = statusRaw,
			StartedAt = DateTime.UtcNow,
			FinishedAt = null
		};
	}

	private sealed class TaskStatusCacheItem {
		public required string Status { get; init; }
		public string? ParserSlug { get; init; }
		public required DateTime StartedAt { get; init; }
	}

	private sealed class CorrelationRecordsCount {
		public Guid? CorrelationId { get; init; }
		public int RecordsCount { get; init; }
	}
}
