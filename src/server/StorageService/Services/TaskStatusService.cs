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
        DateTime? from,
        DateTime? to)
    {
        if (!TryParseStatus(status, out var statusFilter))
            throw new BadRequestException("Invalid status. Allowed values: Running, Success, Failed");

        var actualPage = Math.Max(page ?? 1, 1);
        var actualPageSize = PagedExtensions.GetActualPageSize(pageSize);
        var skip = (actualPage - 1) * actualPageSize;
        var includeRunning = statusFilter == null || statusFilter == ExecutionStatus.Running;
        var includeCompleted = statusFilter == null || statusFilter != ExecutionStatus.Running;

        var runningTasks = includeRunning
            ? await GetRunningTasksAsync(userId, parserSlug, from, to, oldFirst)
            : new List<TaskStatusDto>();

        var logsCollection = mongoDatabase.GetCollection<ExecutionLog>(MongoCollections.ExecutionLogs);
        var completedFilter = BuildExecutionLogsFilter(userId, parserSlug, statusFilter, from, to);
        var completedTotalCount = includeCompleted
            ? (int)await logsCollection.CountDocumentsAsync(completedFilter)
            : 0;

        var items = new List<TaskStatusDto>(actualPageSize);
        var runningTotalCount = runningTasks.Count;
        var runningPart = runningTasks.Skip(skip).Take(actualPageSize).ToList();
        items.AddRange(runningPart);

        var remaining = actualPageSize - items.Count;
        if (remaining > 0 && includeCompleted) {
            var dbSkip = Math.Max(skip - runningTotalCount, 0);
            if (dbSkip < completedTotalCount) {
                var completedItems = await logsCollection.Find(completedFilter)
                    .Sort(oldFirst == true
                        ? Builders<ExecutionLog>.Sort.Ascending(x => x.StartedAt)
                        : Builders<ExecutionLog>.Sort.Descending(x => x.StartedAt))
                    .Skip(dbSkip)
                    .Limit(remaining)
                    .ToListAsync();

                items.AddRange(completedItems.Select(log => new TaskStatusDto {
                    CorrelationId = log.CorrelationId ?? Guid.Empty,
                    ParserSlug = log.ParserSlug,
                    Status = log.Status.ToString(),
                    ErrorMessage = log.ErrorMessage,
                    StartedAt = log.StartedAt,
                    FinishedAt = log.FinishedAt
                }));
            }
        }

        var correlationIds = items.Where(x => x.CorrelationId != Guid.Empty).Select(x => x.CorrelationId).Distinct().ToList();
        var recordsCountByCorrelationId = await GetRecordsCountByCorrelationIdAsync(userId, correlationIds);
        foreach (var task in items) {
            task.RecordsCount = recordsCountByCorrelationId.GetValueOrDefault(task.CorrelationId, 0);
        }

        var totalCount = runningTotalCount + completedTotalCount;
        return items.ToPagedResponse(totalCount, actualPage, actualPageSize);
    }

    public async Task<TaskStatusDto?> GetTaskStatusAsync(Guid userId, Guid correlationId) {
        var recordsCount = (await GetRecordsCountByCorrelationIdAsync(userId, [correlationId]))
            .GetValueOrDefault(correlationId, 0);

        var redisStatus = await cache.GetStringAsync($"task_status:{correlationId}");
        if (redisStatus != null) {
            var task = ToTaskStatusDtoFromCache(correlationId, redisStatus);
            task.RecordsCount = recordsCount;
            return task;
        }

        var logsCollection = mongoDatabase.GetCollection<ExecutionLog>(MongoCollections.ExecutionLogs);
        var log = await logsCollection.Find(x => x.UserId == userId && x.CorrelationId == correlationId)
            .SortByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync();
        if (log == null)
            return null;

        return new TaskStatusDto {
            CorrelationId = correlationId,
            ParserSlug = log.ParserSlug,
            Status = log.Status.ToString(),
            ErrorMessage = log.ErrorMessage,
            StartedAt = log.StartedAt,
            FinishedAt = log.FinishedAt,
            RecordsCount = recordsCount,
        };
    }

    private static FilterDefinition<ExecutionLog> BuildExecutionLogsFilter(
        Guid userId,
        string? parserSlug,
        ExecutionStatus? status,
        DateTime? from,
        DateTime? to) {
        var filters = new List<FilterDefinition<ExecutionLog>> {
            Builders<ExecutionLog>.Filter.Eq(x => x.UserId, userId),
            Builders<ExecutionLog>.Filter.Ne(x => x.CorrelationId, null)
        };

        if (!string.IsNullOrWhiteSpace(parserSlug))
            filters.Add(Builders<ExecutionLog>.Filter.Eq(x => x.ParserSlug, parserSlug));

        if (status is not null && status != ExecutionStatus.Running)
            filters.Add(Builders<ExecutionLog>.Filter.Eq(x => x.Status, status.Value));

        if (from is not null)
            filters.Add(Builders<ExecutionLog>.Filter.Gte(x => x.StartedAt, from.Value));

        if (to is not null)
            filters.Add(Builders<ExecutionLog>.Filter.Lte(x => x.StartedAt, to.Value));

        return Builders<ExecutionLog>.Filter.And(filters);
    }

    private async Task<List<TaskStatusDto>> GetRunningTasksAsync(
        Guid userId,
        string? parserSlug,
        DateTime? from,
        DateTime? to,
        bool? oldFirst) {
        var redisDb = redis.GetDatabase();
        var pendingSetKey = $"running_tasks:{userId}";
        var pendingCorrelationIds = await redisDb.SetMembersAsync(pendingSetKey);
        var runningTasks = new List<TaskStatusDto>();

        foreach (var memberId in pendingCorrelationIds) {
            if (!Guid.TryParse(memberId.ToString(), out var correlationId))
                continue;

            var statusRaw = await cache.GetStringAsync($"task_status:{correlationId}");
            if (statusRaw == null)
                continue;

            var task = ToTaskStatusDtoFromCache(correlationId, statusRaw);
            if (!string.IsNullOrWhiteSpace(parserSlug) && !string.Equals(task.ParserSlug, parserSlug, StringComparison.OrdinalIgnoreCase))
                continue;

            if (from is not null && task.StartedAt < from)
                continue;

            if (to is not null && task.StartedAt > to)
                continue;

            runningTasks.Add(task);
        }

        return oldFirst == true
            ? runningTasks.OrderBy(x => x.StartedAt).ToList()
            : runningTasks.OrderByDescending(x => x.StartedAt).ToList();
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
