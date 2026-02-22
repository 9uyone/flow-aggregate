using Common.Enums;
using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
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
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId()!;
			var (configs, totalCount) = await repo.FindAsync(c => c.UserId == userId, page, pageSize, oldFirst);
			return Results.Ok(
				configs.Select(t => new TaskStatusDto { Status = t.Status.ToString(), ErrorMessage = t.ErrorMessage })
					.ToPagedResponse(totalCount, page, pageSize)
			);
		}).RequireAuthorization();

		group.MapGet("/status/{correlationId}", async (
			[FromRoute] Guid correlationId,
			IMongoRepository<ExecutionLog> repo,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId()!;
			var (config, _) = await repo.FindAsync(c => c.UserId == userId && c.CorrelationId == correlationId);
			if (config == null) {
				return Results.Ok(new TaskStatusDto { Status = ExecutionStatus.Pending.ToString() });
			}
			return Results.Ok(
				new TaskStatusDto { Status = config[0].Status.ToString(), ErrorMessage = config[0].ErrorMessage }
			);
		}).RequireAuthorization();
	}
}
