using Common.Extensions;
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
	}
}
