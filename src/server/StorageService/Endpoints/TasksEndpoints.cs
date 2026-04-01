using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;
using StorageService.Contracts;
using StorageService.Entities;
using System.Text.Json;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapTasksEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/tasks")
			.WithTags("Tasks");

		group.MapGet("/", async (
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst,
			IMongoRepository<ExecutionLog> repo,
			IConnectionMultiplexer redis,
			IDistributedCache cache,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId()!;
			var (configs, totalCount) = await repo.FindAsync(c => c.UserId == userId, page, pageSize, oldFirst);
			
			var tasksFromDb = configs.Select(t => new TaskStatusDto { 
				CorrelationId = t.CorrelationId!.Value,
				ParserSlug = t.ParserSlug,
				Status = t.Status.ToString(), 
				ErrorMessage = t.ErrorMessage,
				StartedAt = t.StartedAt,
				FinishedAt = t.FinishedAt
			}).ToList();
			var correlationIdsInDb = new HashSet<Guid>(configs.Select(c => c.CorrelationId).Cast<Guid>());
			
			var db = redis.GetDatabase();
			var pendingSetKey = $"running_tasks:{userId}";
			var pendingCorrelationIds = await db.SetMembersAsync(pendingSetKey);
			
			var runningTasks = new List<TaskStatusDto>();
			foreach (var memberId in pendingCorrelationIds) {
				if (Guid.TryParse(memberId.ToString(), out var correlationId) && !correlationIdsInDb.Contains(correlationId)) {
					var statusRaw = await cache.GetStringAsync($"task_status:{correlationId}");
					if (statusRaw != null) {
						runningTasks.Add(ToTaskStatusDtoFromCache(correlationId, statusRaw));
					}
				}
			}
			
			tasksFromDb.AddRange(runningTasks);
			var totalWithPending = totalCount + runningTasks.Count;
			
			return Results.Ok(
				tasksFromDb.ToPagedResponse(totalWithPending, page, pageSize)
			);
		}).RequireAuthorization();

		group.MapGet("/status/{correlationId}", async (
			[FromRoute] Guid correlationId,
			IMongoRepository<ExecutionLog> repo,
			IDistributedCache cache,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId()!;
			
			var redisStatus = await cache.GetStringAsync($"task_status:{correlationId}");
			if (redisStatus != null)
				return Results.Ok(ToTaskStatusDtoFromCache(correlationId, redisStatus));
			
			var (config, _) = await repo.FindAsync(c => c.UserId == userId && c.CorrelationId == correlationId);
			if (config.Count == 0)
				return Results.NotFound(new { message = "Task not found" });
			
			var log = config[0];
			return Results.Ok(new TaskStatusDto {
				CorrelationId = correlationId,
				ParserSlug = log.ParserSlug,
				Status = log.Status.ToString(),
				ErrorMessage = log.ErrorMessage,
				StartedAt = log.StartedAt,
				FinishedAt = log.FinishedAt
			});
		}).RequireAuthorization();
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
