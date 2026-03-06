using Common.Constants;
using Common.Contracts.Events;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapAggregationEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/aggregation");

		group.MapGet("/history/{slug}", async (string slug, [FromQuery] string metric, IMongoDatabase db) => {
			var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);

			var data = await collection
				.Find(x => x.ParserSlug == slug && x.Metric == metric)
				.SortBy(x => x.CapturedAt)
				.Project(x => new { x.CapturedAt, x.Value })
				.ToListAsync();

				return Results.Ok(data);
			}).RequireAuthorization();
	}
}
