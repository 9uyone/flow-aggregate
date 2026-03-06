using CollectorService.Services;
using Common.Contracts.Events;
using Common.Enums;
using MassTransit;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace ProcessorService.Consumers;

public class RunParserConsumer(IParserRunner runner, IDistributedCache cache, IConnectionMultiplexer redis, ILogger<RunParserEvent> logger) : IConsumer<RunParserEvent> {
	private const int CacheTtlMinutes = 60; // Кеш на 1 годину

	public async Task Consume(ConsumeContext<RunParserEvent> context) {
		var msg = context.Message;
		try {
			logger.LogInformation($"[Collector] Parser {msg.ParserName} has been started; Config ID {msg.ConfigId}");
			
			var redisDb = redis.GetDatabase();
			var statusKey = $"task_status:{msg.CorrelationId}";
			var runningSetKey = $"running_tasks:{msg.UserId}";
			var ttl = TimeSpan.FromMinutes(CacheTtlMinutes);
			
			await cache.SetStringAsync(statusKey, ExecutionStatus.Running.ToString(), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
			await redisDb.SetAddAsync(runningSetKey, msg.CorrelationId.ToString());

			await runner.ExecuteAsync(msg);

			await redisDb.SetRemoveAsync(runningSetKey, msg.CorrelationId.ToString());
			await cache.RemoveAsync(statusKey);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserName,
				IsSuccess = true,
				FinishedAt = DateTime.UtcNow,
				Options = msg.Options,
			});

			logger.LogInformation($"[Collector] Parser {msg.ParserName} has been finished; Config ID {msg.ConfigId}");
		}
		catch (Exception ex) {
			var redisDb = redis.GetDatabase();
			var statusKey = $"task_status:{msg.CorrelationId}";
			var pendingSetKey = $"pending_tasks:{msg.UserId}";
			
			await redisDb.SetRemoveAsync(pendingSetKey, msg.CorrelationId.ToString());
			await cache.RemoveAsync(statusKey);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserName,
				IsSuccess = false,
				ErrorMessage = ex.Message,
				FinishedAt = DateTime.UtcNow,
				Options = msg.Options,
			});

			throw;
		}
	}
}