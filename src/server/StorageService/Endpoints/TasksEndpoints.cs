using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;
using StorageService.Contracts;
using StorageService.Entities;

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
				Status = t.Status.ToString(), 
				ErrorMessage = t.ErrorMessage 
			}).ToList();
			var correlationIdsInDb = new HashSet<Guid>(configs.Select(c => c.CorrelationId).Cast<Guid>());
			
			var db = redis.GetDatabase();
			var pendingSetKey = $"running_tasks:{userId}";
			var pendingCorrelationIds = await db.SetMembersAsync(pendingSetKey);
			
			var runningTasks = new List<TaskStatusDto>();
			foreach (var memberId in pendingCorrelationIds) {
				if (Guid.TryParse(memberId.ToString(), out var correlationId) && !correlationIdsInDb.Contains(correlationId)) {
					var status = await cache.GetStringAsync($"task_status:{correlationId}");
					if (status != null) {
						runningTasks.Add(new TaskStatusDto { 
							CorrelationId = correlationId,
							Status = status 
						});
					}
				}
			}
			
			tasksFromDb.AddRange(runningTasks); // from Mongo + Redis
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
			
			// Check Redis first
			var redisStatus = await cache.GetStringAsync($"task_status:{correlationId}");
			if (redisStatus != null)
				return Results.Ok(new { Status = redisStatus });
			
			// Then MongoDB
			var (config, _) = await repo.FindAsync(c => c.UserId == userId && c.CorrelationId == correlationId);
			if (config == null)
				return Results.NotFound(new { message = "Task not found" });
			
			return Results.Ok(new { 
				Status = config[0].Status.ToString(),
				ErrorMessage = config[0].ErrorMessage
			});
		}).RequireAuthorization();
	}
}
