using Common.Contracts;
using Common.Contracts.Events;
using Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using MongoDB.Bson;
using MongoDB.Driver;
using StackExchange.Redis;
using StorageService.Contracts;
using StorageService.Entities;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace StorageService.Services;

internal class TaskStatusService(
	IMongoRepository<ExecutionLog> executionLogRepo,
	IMongoRepository<DataCollectedEvent> collectedDataRepo,
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
		ExecutionStatus? statusFilter = null;
		if (!string.IsNullOrWhiteSpace(status)) {
			if (!Enum.TryParse<ExecutionStatus>(status, true, out var parsedStatus))
				throw new BadRequestException("Invalid status. Allowed values: Running, Success, Failed");

			statusFilter = parsedStatus;
		}

		Guid? correlationGuid = null;
		if (!string.IsNullOrWhiteSpace(correlationId) && Guid.TryParse(correlationId, out var parsedGuid))
			correlationGuid = parsedGuid;

		var actualPage = Math.Max(page ?? 1, 1);
		var actualPageSize = PagedExtensions.GetActualPageSize(pageSize);

		if (statusFilter is not null && statusFilter != ExecutionStatus.Running) {
			var completedFilter = BuildCompletedLogsFilter(userId, statusFilter, parserSlug, from, to, correlationGuid);
			var sort = oldFirst == true
				? Builders<ExecutionLog>.Sort.Ascending(x => x.StartedAt)
				: Builders<ExecutionLog>.Sort.Descending(x => x.StartedAt);

			var (completedLogs, totalCount) = await executionLogRepo.FindAsync(completedFilter, sort, actualPage, actualPageSize);
			var pagedItems = completedLogs.Select(MapCompletedLogToDto).ToList();
			await SetRecordsCountAsync(userId, pagedItems);

			return pagedItems.ToPagedResponse(totalCount, actualPage, actualPageSize);
		}

		var allTasks = await GetTasksByStatusAsync(userId, statusFilter, parserSlug, from, to, correlationGuid);
		var filteredTasks = allTasks.Where(task => {
			if (statusFilter is not null
				&& !string.Equals(task.Status, statusFilter.Value.ToString(), StringComparison.OrdinalIgnoreCase))
				return false;

			if (from is not null && (task.StartedAt is null || task.StartedAt < from))
				return false;

			if (to is not null && (task.StartedAt is null || task.StartedAt > to))
				return false;

			if (string.IsNullOrWhiteSpace(parserSlug))
				return true;

			return !string.IsNullOrWhiteSpace(task.ParserSlug)
				&& task.ParserSlug.Contains(parserSlug, StringComparison.OrdinalIgnoreCase);
		});

		var filteredList = (oldFirst == true
			? filteredTasks.OrderBy(x => x.StartedAt)
			: filteredTasks.OrderByDescending(x => x.StartedAt)).ToList();

		var skip = (actualPage - 1) * actualPageSize;
		var pagedItemsInMemory = filteredList.Skip(skip).Take(actualPageSize).ToList();
		await SetRecordsCountAsync(userId, pagedItemsInMemory);

		return pagedItemsInMemory.ToPagedResponse(filteredList.Count, actualPage, actualPageSize);
	}

	private async Task<List<TaskStatusDto>> GetTasksByStatusAsync(
		Guid userId,
		ExecutionStatus? statusFilter,
		string? parserSlug,
		DateTime? from,
		DateTime? to,
		Guid? correlationGuid) {
		var allTasks = new List<TaskStatusDto>();

		if (statusFilter is null || statusFilter == ExecutionStatus.Running) {
			var runningTasks = await GetRunningTasksAsync(userId);
			if (correlationGuid.HasValue)
				runningTasks = runningTasks.Where(t => t.CorrelationId == correlationGuid.Value).ToList();
			allTasks.AddRange(runningTasks);
		}

		if (statusFilter is null || statusFilter != ExecutionStatus.Running) {
			var completedFilter = BuildCompletedLogsFilter(userId, statusFilter, parserSlug, from, to, correlationGuid);
			var completedLogs = await executionLogRepo.FindAllAsync(completedFilter);
			allTasks.AddRange(completedLogs.Select(MapCompletedLogToDto));
		}

		return allTasks;
	}

	private static TaskStatusDto MapCompletedLogToDto(ExecutionLog log) => new() {
		CorrelationId = log.CorrelationId!.Value,
		ParserSlug = log.ParserSlug,
		ParserOptions = log.Options,
		Status = log.Status.ToString(),
		ErrorMessage = log.ErrorMessage,
		StartedAt = log.StartedAt,
		FinishedAt = log.FinishedAt,
	};

	private static FilterDefinition<ExecutionLog> BuildCompletedLogsFilter(
		Guid userId,
		ExecutionStatus? statusFilter,
		string? parserSlug,
		DateTime? from,
		DateTime? to,
		Guid? correlationGuid = null) {
		var filters = new List<FilterDefinition<ExecutionLog>> {
			Builders<ExecutionLog>.Filter.Eq(x => x.UserId, userId),
			Builders<ExecutionLog>.Filter.Ne(x => x.CorrelationId, null)
		};

		if (statusFilter is not null)
			filters.Add(Builders<ExecutionLog>.Filter.Eq(x => x.Status, statusFilter.Value));

		if (from is not null)
			filters.Add(Builders<ExecutionLog>.Filter.Gte(x => x.StartedAt, from.Value));

		if (to is not null)
			filters.Add(Builders<ExecutionLog>.Filter.Lte(x => x.StartedAt, to.Value));

		if (!string.IsNullOrWhiteSpace(parserSlug)) {
			var parserRegex = new BsonRegularExpression(Regex.Escape(parserSlug.Trim()), "i");
			filters.Add(Builders<ExecutionLog>.Filter.Regex(x => x.ParserSlug, parserRegex));
		}

		if (correlationGuid.HasValue)
			filters.Add(Builders<ExecutionLog>.Filter.Eq(x => x.CorrelationId, correlationGuid.Value));

		return Builders<ExecutionLog>.Filter.And(filters);
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

	private async Task SetRecordsCountAsync(Guid userId, List<TaskStatusDto> tasks) {
		if (tasks.Count == 0)
			return;

		var correlationIds = tasks.Select(x => x.CorrelationId).Distinct().ToList();
		var recordsCountByCorrelationId = await GetRecordsCountByCorrelationIdAsync(userId, correlationIds);
		foreach (var task in tasks)
			task.RecordsCount = recordsCountByCorrelationId.GetValueOrDefault(task.CorrelationId, 0);
	}

	private async Task<Dictionary<Guid, int>> GetRecordsCountByCorrelationIdAsync(
		Guid userId,
		IReadOnlyCollection<Guid> correlationIds) {
		if (correlationIds.Count == 0)
			return new Dictionary<Guid, int>();

		var filter = Builders<DataCollectedEvent>.Filter.And(
			Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId),
			Builders<DataCollectedEvent>.Filter.In(x => x.CorrelationId, correlationIds.Select(x => (Guid?)x)));

		var data = await collectedDataRepo.FindAllAsync(filter);
		return data
			.Where(x => x.CorrelationId is not null)
			.GroupBy(x => x.CorrelationId!.Value)
			.ToDictionary(g => g.Key, g => g.Count());
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
}
