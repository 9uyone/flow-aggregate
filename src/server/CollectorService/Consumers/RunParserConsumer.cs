using CollectorService.Services;
using Common.Contracts;
using Common.Contracts.Events;
using Common.Enums;
using MassTransit;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace ProcessorService.Consumers;

public class RunParserConsumer(IParserRunner runner, IDistributedCache cache, IConnectionMultiplexer redis, ILogger<RunParserCommand> logger) : IConsumer<RunParserCommand> {
	private const int CacheTtlMinutes = 60; // Кеш на 1 годину

	public async Task Consume(ConsumeContext<RunParserCommand> context) {
		var msg = context.Message;
		try {
			logger.LogInformation($"[Collector]; Parser {msg.ParserName} has been started; Config ID {msg.ConfigId}");
			
			var redisDb = redis.GetDatabase();
			var statusKey = $"task_status:{msg.CorrelationId}";
			var pendingSetKey = $"pending_tasks:{msg.UserId}";
			var ttl = TimeSpan.FromMinutes(CacheTtlMinutes);
			
			await cache.SetStringAsync(statusKey, ExecutionStatus.Pending.ToString(), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
			await redisDb.SetAddAsync(pendingSetKey, msg.CorrelationId.ToString());

			await runner.ExecuteAsync(msg);

			await redisDb.SetRemoveAsync(pendingSetKey, msg.CorrelationId.ToString());
			await cache.RemoveAsync(statusKey);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserName,
				IsSuccess = true,
				FinishedAtUtc = DateTime.UtcNow,
				Options = msg.Options,
			});

			logger.LogInformation($"[Collector]; Parser {msg.ParserName} has been finished; Config ID {msg.ConfigId}");
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
				FinishedAtUtc = DateTime.UtcNow,
				Options = msg.Options,
			});

			throw;
		}
	}
}