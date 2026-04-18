using Common.Constants;
using Common.Contracts.Events;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapAggregationInternalEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/internal/storage/aggregation");

		group.MapGet("/history/{slug}", async (HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string interval,
			[FromQuery] DateTime from, [FromQuery] DateTime to,
			IHistoryAggregationService historyAggregationService) =>
		{
			var dimensions = context.Request.Query
				.Where(x => x.Key is not ("metric" or "interval" or "from" or "to"))
				.Where(x => !string.IsNullOrWhiteSpace(x.Value))
				.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

			var result = await historyAggregationService.GetHistoryAsync(slug, metric, interval, from, to, dimensions);
			return result.Success ? Results.Ok(result.Data ?? []) : Results.BadRequest(result.ErrorMessage);
		});

		group.MapGet("/stats/{slug}", async (HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] DateTime from,
			[FromQuery] DateTime to,
			IHistoryStatsService historyStatsService) =>
		{
			var dimensions = context.Request.Query
				.Where(x => x.Key is not ("metric" or "from" or "to"))
				.Where(x => !string.IsNullOrWhiteSpace(x.Value))
				.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

			var result = await historyStatsService.GetStatsAsync(slug, metric, from, to, dimensions);
			return result.Success ? Results.Ok(result.Data) : Results.BadRequest(result.ErrorMessage);
		});

		group.MapGet("/metrics/{slug}", async (string slug, IMongoDatabase db) => {
			var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
			var metrics = await collection.Distinct<string>("Metric", Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)).ToListAsync();
			return Results.Ok(metrics);
		});

		group.MapGet("/dimension-options/{slug}", async (HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string dimension,
			IHistoryAggregationService historyAggregationService) =>
		{
			var dimensions = context.Request.Query
				.Where(x => x.Key is not ("metric" or "dimension"))
				.Where(x => !string.IsNullOrWhiteSpace(x.Value))
				.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

			var result = await historyAggregationService.GetDimensionOptionsAsync(slug, metric, dimension, dimensions);
			return result.Success ? Results.Ok(result.Data ?? []) : Results.BadRequest(result.ErrorMessage);
		});
	}
}
