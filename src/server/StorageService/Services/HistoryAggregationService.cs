using Common.Constants;
using Common.Contracts.Events;
using MongoDB.Bson;
using MongoDB.Driver;

namespace StorageService.Services;

public sealed record HistoryPointDto(string Timestamp, double Value);
public sealed record DimensionOptionsResult(bool Success, string? ErrorMessage, string[]? Data);

public sealed record HistoryAggregationResult(bool Success, string? ErrorMessage, HistoryPointDto[]? Data);

public interface IHistoryAggregationService {
	Task<HistoryAggregationResult> GetHistoryAsync(string slug, string metric, string interval, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
	Task<DimensionOptionsResult> GetDimensionOptionsAsync(string slug, string metric, string dimensionKey, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
}

public sealed class HistoryAggregationService(IMongoDatabase db) : IHistoryAggregationService {
	public async Task<HistoryAggregationResult> GetHistoryAsync(string slug, string metric, string interval, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			return new HistoryAggregationResult(false, "Metric is required.", null);

		if (string.IsNullOrWhiteSpace(interval))
			return new HistoryAggregationResult(false, "Interval is required.", null);

		if (from > to)
			return new HistoryAggregationResult(false, "'from' must be less than or equal to 'to'.", null);

		var unit = interval.Trim().ToLowerInvariant();

		if (unit is not ("hour" or "day" or "week" or "month"))
			return new HistoryAggregationResult(false, "Interval must be one of: hour, day, week, month.", null);

		var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var filter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)
			& Builders<DataCollectedEvent>.Filter.Gte(x => x.CapturedAt, from)
			& Builders<DataCollectedEvent>.Filter.Lte(x => x.CapturedAt, to);

		if (dimensions is not null) {
			foreach (var dimension in dimensions) {
				if (string.IsNullOrWhiteSpace(dimension.Key) || string.IsNullOrWhiteSpace(dimension.Value))
					continue;

				filter &= Builders<DataCollectedEvent>.Filter.Eq($"Metadata.{dimension.Key}", dimension.Value);
			}
		}

		var metricValueExpr = MetricValueExpressionBuilder.Build(metric);

		var data = await collection.Aggregate()
			.Match(filter)
			.AppendStage<BsonDocument>(new BsonDocument("$addFields", new BsonDocument("metricValue", metricValueExpr)))
			.AppendStage<BsonDocument>(new BsonDocument("$match", new BsonDocument("metricValue", new BsonDocument("$ne", BsonNull.Value))))
			.AppendStage<BsonDocument>(new BsonDocument("$group", new BsonDocument
			{
				{
					"_id", new BsonDocument("$dateTrunc", new BsonDocument
					{
						{ "date", "$CapturedAt" },
						{ "unit", unit },
						{ "timezone", "UTC" }
					})
				},
				{ "value", new BsonDocument("$avg", "$metricValue") }
			}))
			.AppendStage<BsonDocument>(new BsonDocument("$project", new BsonDocument
			{
				{ "_id", 0 },
				{
					"timestamp", new BsonDocument("$dateToString", new BsonDocument
					{
						{ "date", "$_id" },
						{ "format", "%Y-%m-%dT%H:%M:%SZ" },
						{ "timezone", "UTC" }
					})
				},
				{ "value", 1 }
			}))
			.Sort(new BsonDocument("timestamp", 1))
			.ToListAsync(cancellationToken);

		var result = data
			.Select(x => new HistoryPointDto(x["timestamp"].AsString, x["value"].ToDouble()))
			.ToArray();

		return new HistoryAggregationResult(true, null, result);
	}

	public async Task<DimensionOptionsResult> GetDimensionOptionsAsync(string slug, string metric, string dimensionKey, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			return new DimensionOptionsResult(false, "Metric is required.", null);

		if (string.IsNullOrWhiteSpace(dimensionKey))
			return new DimensionOptionsResult(false, "Dimension key is required.", null);

		var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var metricFilter = Builders<DataCollectedEvent>.Filter.Or(
			Builders<DataCollectedEvent>.Filter.Eq(x => x.Metric, metric),
			Builders<DataCollectedEvent>.Filter.Exists($"Metadata.{metric}", true));
		var filter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)
			& metricFilter;

		if (dimensions is not null) {
			foreach (var dimension in dimensions) {
				if (string.Equals(dimension.Key, dimensionKey, StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(dimension.Key) || string.IsNullOrWhiteSpace(dimension.Value))
					continue;

				filter &= Builders<DataCollectedEvent>.Filter.Eq($"Metadata.{dimension.Key}", dimension.Value);
			}
		}

		var values = await collection.Distinct<string>($"Metadata.{dimensionKey}", filter).ToListAsync(cancellationToken);

		var result = values
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(x => x)
			.ToArray();

		return new DimensionOptionsResult(true, null, result);
	}
}
