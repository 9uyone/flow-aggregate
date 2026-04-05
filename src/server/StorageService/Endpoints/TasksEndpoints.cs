using Common.Extensions;
using Microsoft.AspNetCore.Mvc;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapTasksEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/tasks")
			.WithTags("Tasks");

		group.MapGet("/", async (
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst,
			[FromQuery] string? status,
			[FromQuery] string? parserSlug,
			[FromQuery] string? correlationId,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to,
			TaskStatusService service,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId()!;
			var result = await service.GetTasksAsync(userId, page, pageSize, oldFirst, status, parserSlug, correlationId, from, to);
			return Results.Ok(result);
		}).RequireAuthorization();
	}
}
