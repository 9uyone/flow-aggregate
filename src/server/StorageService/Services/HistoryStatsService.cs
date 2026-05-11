using Common.Constants;
using Common.Contracts.Events;
using Common.Exceptions;
using MongoDB.Bson;
using MongoDB.Driver;

using StorageService.Interfaces;

namespace StorageService.Services;

public sealed record HistoryStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double FirstValue,
	double LastValue,
	string? FirstTimestamp,
	string? LastTimestamp);

public sealed class HistoryStatsService(IMongoDatabase db) : IHistoryStatsService {
	public async Task<HistoryStatsDto> GetStatsAsync(Guid? userId, string slug, string metric, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			throw new BadRequestException("Metric is required.");

		if (from > to)
			throw new BadRequestException("'from' must be less than or equal to 'to'.");

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
			.AppendStage<BsonDocument>(new BsonDocument("$sort", new BsonDocument("CapturedAt", 1)))
			.AppendStage<BsonDocument>(new BsonDocument("$group", new BsonDocument
			{
				{ "_id", BsonNull.Value },
				{ "count", new BsonDocument("$sum", 1) },
				{ "min", new BsonDocument("$min", "$metricValue") },
				{ "max", new BsonDocument("$max", "$metricValue") },
				{ "average", new BsonDocument("$avg", "$metricValue") },
				{ "firstValue", new BsonDocument("$first", "$metricValue") },
				{ "lastValue", new BsonDocument("$last", "$metricValue") },
				{ "firstTimestamp", new BsonDocument("$first", "$CapturedAt") },
				{ "lastTimestamp", new BsonDocument("$last", "$CapturedAt") }
			}))
			.FirstOrDefaultAsync(cancellationToken);

		if (data is null)
			return new HistoryStatsDto(0, 0, 0, 0, 0, 0, null, null);

		return new HistoryStatsDto(
			data["count"].ToDouble(),
			data["min"].ToDouble(),
			data["max"].ToDouble(),
			data["average"].ToDouble(),
			data["firstValue"].ToDouble(),
			data["lastValue"].ToDouble(),
			data["firstTimestamp"].ToUniversalTime().ToString("O"),
			data["lastTimestamp"].ToUniversalTime().ToString("O"));
	}
}
