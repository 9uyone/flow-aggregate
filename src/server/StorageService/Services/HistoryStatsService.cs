using Common.Constants;
using Common.Contracts.Events;
using MongoDB.Bson;
using MongoDB.Driver;

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

public sealed record HistoryStatsResult(bool Success, string? ErrorMessage, HistoryStatsDto? Data);

public interface IHistoryStatsService {
	Task<HistoryStatsResult> GetStatsAsync(string slug, string metric, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
}

public sealed class HistoryStatsService(IMongoDatabase db) : IHistoryStatsService {
	public async Task<HistoryStatsResult> GetStatsAsync(string slug, string metric, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(metric))
			return new HistoryStatsResult(false, "Metric is required.", null);

		if (from > to)
			return new HistoryStatsResult(false, "'from' must be less than or equal to 'to'.", null);

		var collection = db.GetCollection<DataCollectedEvent>(MongoCollections.CollectedData);
		var filter = Builders<DataCollectedEvent>.Filter.Eq(x => x.ParserSlug, slug)
			& Builders<DataCollectedEvent>.Filter.Eq(x => x.Metric, metric)
			& Builders<DataCollectedEvent>.Filter.Gte(x => x.CapturedAt, from)
			& Builders<DataCollectedEvent>.Filter.Lte(x => x.CapturedAt, to);

		if (dimensions is not null) {
			foreach (var dimension in dimensions) {
				if (string.IsNullOrWhiteSpace(dimension.Key) || string.IsNullOrWhiteSpace(dimension.Value)) {
					continue;
				}

				filter &= Builders<DataCollectedEvent>.Filter.Eq($"Metadata.{dimension.Key}", dimension.Value);
			}
		}

		var data = await collection.Aggregate()
			.Match(filter)
			.SortBy(x => x.CapturedAt)
			.AppendStage<BsonDocument>(new BsonDocument("$group", new BsonDocument
			{
				{ "_id", BsonNull.Value },
				{ "count", new BsonDocument("$sum", 1) },
				{ "min", new BsonDocument("$min", new BsonDocument("$toDouble", "$Value")) },
				{ "max", new BsonDocument("$max", new BsonDocument("$toDouble", "$Value")) },
				{ "average", new BsonDocument("$avg", new BsonDocument("$toDouble", "$Value")) },
				{ "firstValue", new BsonDocument("$first", new BsonDocument("$toDouble", "$Value")) },
				{ "lastValue", new BsonDocument("$last", new BsonDocument("$toDouble", "$Value")) },
				{ "firstTimestamp", new BsonDocument("$first", "$CapturedAt") },
				{ "lastTimestamp", new BsonDocument("$last", "$CapturedAt") }
			}))
			.FirstOrDefaultAsync(cancellationToken);

		if (data is null) {
			return new HistoryStatsResult(true, null, new HistoryStatsDto(0, 0, 0, 0, 0, 0, null, null));
		}

		return new HistoryStatsResult(true, null, new HistoryStatsDto(
			data["count"].ToDouble(),
			data["min"].ToDouble(),
			data["max"].ToDouble(),
			data["average"].ToDouble(),
			data["firstValue"].ToDouble(),
			data["lastValue"].ToDouble(),
			data["firstTimestamp"].ToUniversalTime().ToString("O"),
			data["lastTimestamp"].ToUniversalTime().ToString("O")));
	}
}
