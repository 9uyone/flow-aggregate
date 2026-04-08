using Common.Extensions;
using Microsoft.AspNetCore.Mvc;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapCollectedDataEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/collected")
			.WithTags("Collected data");

		group.MapGet("/", async (
			HttpContext httpContext,
			[FromQuery] Guid? correlationId,
			[FromQuery] Guid? configId,
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst,
			[FromQuery] string? parserSlug,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to,
			[FromQuery] string? search,
			CollectedDataService service) => {
				var userId = httpContext.User.GetUserId()!;
				var result = await service.GetAsync(userId, correlationId, configId, page, pageSize, oldFirst, parserSlug, from, to, search);
				return Results.Ok(result);
			}).RequireAuthorization();

		group.MapGet("/{id}", async (
			HttpContext httpContext,
			Guid id,
			CollectedDataService service) => {
				var userId = httpContext.User.GetUserId()!;
				var result = await service.GetByIdAsync(userId, id);
				return Results.Ok(result);
			}).RequireAuthorization();
	}
}