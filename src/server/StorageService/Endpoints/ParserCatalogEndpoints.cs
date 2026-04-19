using Common.Extensions;
using StorageService.Contracts.ParserCatalog;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapParserCatalogEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/parsers")
			.WithTags("Parser Catalog");

		group.MapGet("/", async (ParserCatalogService service, HttpContext httpContext) => {
			var userId = httpContext.User.GetUserId()!;
			var data = await service.GetAllAsync(userId);
			return Results.Ok(data);
		}).RequireAuthorization();

		group.MapPost("/external", async (UpsertExternalParserDefinitionDto dto, ParserCatalogService service, HttpContext httpContext) => {
			var userId = httpContext.User.GetUserId()!;
			var data = await service.UpsertExternalAsync(userId, dto);
			return Results.Ok(data);
		}).RequireAuthorization();

		group.MapPut("/external/{slug}", async (string slug, UpsertExternalParserDefinitionDto dto, ParserCatalogService service, HttpContext httpContext) => {
			var userId = httpContext.User.GetUserId()!;
			var data = await service.UpsertExternalAsync(userId, new UpsertExternalParserDefinitionDto {
				Slug = slug,
				DisplayName = dto.DisplayName,
				Description = dto.Description,
				MetricFields = dto.MetricFields,
				Dimensions = dto.Dimensions,
			});
			return Results.Ok(data);
		}).RequireAuthorization();
	}
}
