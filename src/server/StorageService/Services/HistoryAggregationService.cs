using Common.Constants;
using Common.Contracts.Events;
using Common.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

using StorageService.Interfaces;

namespace StorageService.Services;

public sealed record HistoryPointDto(string Timestamp, double Value);

public sealed class HistoryAggregationService(IMongoDatabase db) : IHistoryAggregationService {
	public async Task<HistoryPointDto[]> GetHistoryAsync(Guid? userId, string slug, string metric, string interval, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			throw new BadRequestException("Metric is required.");

		if (string.IsNullOrWhiteSpace(interval))
			throw new BadRequestException("Interval is required.");

		if (from > to)
			throw new BadRequestException("'from' must be less than or equal to 'to'.");

		var unit = interval.Trim().ToLowerInvariant();

		if (unit is not ("hour" or "day" or "week" or "month"))
			throw new BadRequestException("Interval must be one of: hour, day, week, month.");

		var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var filter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)
	& Builders<DataCollectedEvent>.Filter.Gte(x => x.CapturedAt, from)
	& Builders<DataCollectedEvent>.Filter.Lte(x => x.CapturedAt, to);

		if (userId.HasValue) {
			filter &= Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId.Value);
		}

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

		return data
			.Select(x => new HistoryPointDto(x["timestamp"].AsString, x["value"].ToDouble()))
			.ToArray();
	}

	public async Task<string[]> GetDimensionOptionsAsync(Guid? userId, string slug, string metric, string dimensionKey, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			throw new BadRequestException("Metric is required.");

		if (string.IsNullOrWhiteSpace(dimensionKey))
			throw new BadRequestException("Dimension key is required.");

		var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var metricFilter = Builders<DataCollectedEvent>.Filter.Or(
			Builders<DataCollectedEvent>.Filter.Eq(x => x.Metric, metric),
			Builders<DataCollectedEvent>.Filter.Exists($"Metadata.{metric}", true));
		var filter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)
	& metricFilter;

		if (userId.HasValue) {
			filter &= Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId.Value);
		}

		if (dimensions is not null) {
			foreach (var dimension in dimensions) {
				if (string.Equals(dimension.Key, dimensionKey, StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(dimension.Key) || string.IsNullOrWhiteSpace(dimension.Value))
					continue;

				filter &= Builders<DataCollectedEvent>.Filter.Eq($"Metadata.{dimension.Key}", dimension.Value);
			}
		}

		var values = await collection.Distinct<string>($"Metadata.{dimensionKey}", filter).ToListAsync(cancellationToken);

		return values
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(x => x)
			.ToArray();
	}
}
