using CollectorService.Services;
using Common.Contracts.Events;
using Common.Enums;
using MassTransit;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;
using System.Text.Json;

namespace ProcessorService.Consumers;

public class RunParserConsumer(IParserRunner runner, IDistributedCache cache, IConnectionMultiplexer redis, ILogger<RunParserEvent> logger) : IConsumer<RunParserEvent> {
	private const int CacheTtlMinutes = 60; // Кеш на 1 годину

	public async Task Consume(ConsumeContext<RunParserEvent> context) {
		var msg = context.Message;
		var startedAt = DateTime.UtcNow;
		try {
			logger.LogInformation($"[Collector] Parser {msg.ParserSlug} has been started; Config ID {msg.ConfigId}");
			
			var redisDb = redis.GetDatabase();
			var statusKey = $"task_status:{msg.CorrelationId}";
			var runningSetKey = $"running_tasks:{msg.UserId}";
			var ttl = TimeSpan.FromMinutes(CacheTtlMinutes);
			var runningStatus = JsonSerializer.Serialize(new TaskStatusCacheItem {
				Status = ExecutionStatus.Running.ToString(),
				ParserSlug = msg.ParserSlug,
				StartedAt = startedAt
			});
			
			await cache.SetStringAsync(statusKey, runningStatus, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
			await redisDb.SetAddAsync(runningSetKey, msg.CorrelationId.ToString());

			await runner.ExecuteAsync(msg);

			await redisDb.SetRemoveAsync(runningSetKey, msg.CorrelationId.ToString());
			await cache.RemoveAsync(statusKey);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserSlug,
				IsSuccess = true,
				StartedAt = startedAt,
				FinishedAt = DateTime.UtcNow,
				Options = msg.Options,
			});

			logger.LogInformation($"[Collector] Parser {msg.ParserSlug} has been finished; Config ID {msg.ConfigId}");
		}
		catch (Exception ex) {
			var redisDb = redis.GetDatabase();
			var statusKey = $"task_status:{msg.CorrelationId}";
			var runningSetKey = $"running_tasks:{msg.UserId}";
			
			await redisDb.SetRemoveAsync(runningSetKey, msg.CorrelationId.ToString());
			await cache.RemoveAsync(statusKey);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserSlug,
				IsSuccess = false,
				ErrorMessage = ex.Message,
				StartedAt = startedAt,
				FinishedAt = DateTime.UtcNow,
				Options = msg.Options,
			});

			throw;
		}
	}

	private sealed class TaskStatusCacheItem {
		public required string Status { get; init; }
		public string? ParserSlug { get; init; }
		public required DateTime StartedAt { get; init; }
	}
}