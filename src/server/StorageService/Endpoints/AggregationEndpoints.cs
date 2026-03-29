using Common.Constants;
using Common.Contracts.Events;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapAggregationInternalEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/internal/storage/aggregation");

		group.MapGet("/history/{slug}", async (string slug, 
			[FromQuery] string metric,
			[FromQuery] DateTime from, [FromQuery] DateTime to,
			IMongoDatabase db) => 
		{
			var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);

			var data = await collection.Aggregate()
				.Match(x => x.ParserSlug == slug && x.Metric == metric && x.CapturedAt >= from && x.CapturedAt <= to)
				.Group(x => x.CapturedAt.Date, g => new { Timestamp = g.Key, Value = g.Average(x => x.Value) }) // групуємо по днях
				.SortBy(x => x.Timestamp)
				.ToListAsync();

			return Results.Ok(data);
		});

		group.MapGet("/metrics/{slug}", async (string slug, IMongoDatabase db) => {
			var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
			var metrics = await collection.Distinct<string>("Metric", Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)).ToListAsync();
			return Results.Ok(metrics);
		});
	}
}