using Common.Extensions;
using Microsoft.AspNetCore.Mvc;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapInternalParserConfigEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/internal/storage/parser-cfg");

		group.MapGet("/by-token-hash/{tokenHash}", async (
			string tokenHash,
			ParserConfigInternalService service) => {
				var config = await service.GetByTokenHashAsync(tokenHash);
				return config != null ? Results.Ok(config) : Results.NotFound();
			});

		group.MapGet("/active-internal", async (
			ParserConfigInternalService service,
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 100) => {
				var (configs, totalCount) = await service.GetActiveInternalConfigsAsync(page, pageSize);
				return Results.Ok(configs.ToPagedResponse(totalCount, page, pageSize));
			});
	}
}
