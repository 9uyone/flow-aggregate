using Common.Contracts;
using Common.Interfaces;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapCollectedDataEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/collected")
			.WithTags("Collected data");

		group.MapGet("/source/{src}", async (string src, int? page, int? pageSize, IMongoRepository<DataCollectedEvent> repo) => {
			var results = await repo.GetBySourceAsync(src, page, pageSize);
			return Results.Ok(results);
		});
	}
}