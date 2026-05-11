using Common.Constants;
using Common.Contracts.Events;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using StorageService.Interfaces;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapAggregationInternalEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/internal/storage/aggregation");

		group.MapGet("/history/{slug}", async (HttpContext context, string slug,
	[FromQuery] string metric,
	[FromQuery] string interval,
	[FromQuery] DateTime from,
	[FromQuery] DateTime to,
	[FromQuery] Guid? userId,
	IHistoryAggregationService historyAggregationService) => {
		var dimensions = context.Request.Query
			.Where(x => x.Key is not ("metric" or "interval" or "from" or "to" or "userId"))
			.Where(x => !string.IsNullOrWhiteSpace(x.Value))
			.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

		var result = await historyAggregationService.GetHistoryAsync(userId, slug, metric, interval, from, to, dimensions);
		return Results.Ok(result);
	});

		group.MapGet("/stats/{slug}", async (HttpContext context, string slug,
	[FromQuery] string metric,
	[FromQuery] DateTime from,
	[FromQuery] DateTime to,
	[FromQuery] Guid? userId,
	IHistoryStatsService historyStatsService) => {
		var dimensions = context.Request.Query
			.Where(x => x.Key is not ("metric" or "from" or "to" or "userId"))
			.Where(x => !string.IsNullOrWhiteSpace(x.Value))
			.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

		var result = await historyStatsService.GetStatsAsync(userId, slug, metric, from, to, dimensions);
		return Results.Ok(result);
	});

		group.MapGet("/metrics/{slug}", async (string slug, [FromQuery] Guid? userId, IMongoDatabase db) => {
			var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
			var parserFilter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug);
			if (userId.HasValue)
				parserFilter &= Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId.Value);

			var directMetrics = await collection.Distinct<string>("Metric", parserFilter).ToListAsync();
			var metadataMetricKeys = await collection.Aggregate()
				.Match(parserFilter)
				.AppendStage<BsonDocument>(new BsonDocument("$project", new BsonDocument("metadataArray", new BsonDocument("$objectToArray", new BsonDocument("$ifNull", new BsonArray { "$Metadata", new BsonDocument() })))))
				.AppendStage<BsonDocument>(new BsonDocument("$unwind", "$metadataArray"))
				.AppendStage<BsonDocument>(new BsonDocument("$match", new BsonDocument("$expr", new BsonDocument("$ne", new BsonArray {
							new BsonDocument("$convert", new BsonDocument {
								{ "input", new BsonDocument("$replaceAll", new BsonDocument {
									{ "input", new BsonDocument("$toString", "$metadataArray.v") },
									{ "find", "," },
									{ "replacement", "." }
								})},
								{ "to", "double" },
								{ "onError", BsonNull.Value },
								{ "onNull", BsonNull.Value }
							}),
							BsonNull.Value
				}))))
				.AppendStage<BsonDocument>(new BsonDocument("$group", new BsonDocument("_id", "$metadataArray.k")))
				.ToListAsync();

			var excludedMetadataKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
						MetadataKeys.Provider,
						"description",
						"location"
			};

			var primaryMetrics = directMetrics
				.Where(x => !string.IsNullOrWhiteSpace(x))
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.OrderBy(x => x)
				.ToArray();

			var secondaryMetrics = metadataMetricKeys
				.Select(x => x["_id"].AsString)
				.Where(x => !string.IsNullOrWhiteSpace(x))
				.Where(x => !excludedMetadataKeys.Contains(x))
				.Where(x => !primaryMetrics.Contains(x, StringComparer.OrdinalIgnoreCase))
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.OrderBy(x => x)
				.ToArray();

			var result = primaryMetrics
				.Concat(secondaryMetrics)
				.ToArray();

			return Results.Ok(result);
		});

		group.MapGet("/dimension-options/{slug}", async (HttpContext context, string slug,
	[FromQuery] string metric,
	[FromQuery] string dimension,
	[FromQuery] Guid? userId,
	IHistoryAggregationService historyAggregationService) => {
		var dimensions = context.Request.Query
			.Where(x => x.Key is not ("metric" or "dimension" or "userId"))
			.Where(x => !string.IsNullOrWhiteSpace(x.Value))
			.ToDictionary(x => x.Key, x => x.Value.ToString(), StringComparer.OrdinalIgnoreCase);

		var result = await historyAggregationService.GetDimensionOptionsAsync(userId, slug, metric, dimension, dimensions);
		return Results.Ok(result);
	});
	}
}

