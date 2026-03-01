using Common.Enums;
using Common.Extensions;
using Microsoft.AspNetCore.Mvc;
using StorageService.Contracts.ParserUserConfig;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapParserConfigEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/parser-cfg");

		// Create
		group.MapPost("/internal", async (
			UserConfigCreateInternalDto dto,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				await service.CreateInternalAsync(dto, userId);
				return Results.Ok();
			}).RequireAuthorization();

		group.MapPost("/external", async (
			UserConfigCreateExternalDto dto,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var token = await service.CreateExternalAsync(dto, userId);
				return Results.Ok(new { Token = token });
			}).RequireAuthorization();

		// Get all for user
		group.MapGet("/", async (
			ParserConfigService service,
			HttpContext httpContext,
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst) => {
				var userId = httpContext.User.GetUserId()!;
				var (configs, totalCount) = await service.GetAllForUserAsync(userId, page, pageSize, oldFirst);
				return Results.Ok(configs.ToPagedResponse(totalCount, page, pageSize));
			}).RequireAuthorization();

		// Get by id
		group.MapGet("/{id}", async (
			Guid id,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var config = await service.GetByIdAsync(id, userId);
				return Results.Ok(config);
			}).RequireAuthorization();

		// Patch
		group.MapPatch("/{id}", async (
			Guid id,
			UserConfigPatchDto dto,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var config = await service.GetByIdAsync(id, userId);
				
				if (config.SourceType == ParserSourceType.Internal)
					await service.UpdateInternalAsync(id, dto, userId);
				else
					await service.UpdateExternalAsync(id, dto, userId);

				return Results.NoContent();
			}).RequireAuthorization();

		// Delete
		group.MapDelete("/{id}", async (
			Guid id,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				await service.DeleteAsync(id, userId);
				return Results.NoContent();
			}).RequireAuthorization();

		// Run config
		group.MapPost("/{id}/run", async (
			Guid id,
			ParserConfigService service,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId();
				var result = await service.RunConfigAsync(id, userId!);
				return Results.Accepted(value: result);
			}).RequireAuthorization();
	}
}