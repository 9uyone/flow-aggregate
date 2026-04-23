using MongoDB.Bson;

namespace StorageService.Services;

internal static class MetricValueExpressionBuilder {
	public static BsonDocument Build(string metric) {
		var metadataRawValue = new BsonDocument("$getField", new BsonDocument {
			{ "field", metric },
			{ "input", "$Metadata" }
		});
		var metadataNormalizedNumberString = new BsonDocument("$replaceAll", new BsonDocument {
			{ "input", new BsonDocument("$toString", metadataRawValue) },
			{ "find", "," },
			{ "replacement", "." }
		});

		return new BsonDocument("$cond", new BsonArray {
			new BsonDocument("$eq", new BsonArray { "$Metric", metric }),
			new BsonDocument("$convert", new BsonDocument {
				{ "input", "$Value" },
				{ "to", "double" },
				{ "onError", BsonNull.Value },
				{ "onNull", BsonNull.Value }
			}),
			new BsonDocument("$convert", new BsonDocument {
				{ "input", metadataNormalizedNumberString },
				{ "to", "double" },
				{ "onError", BsonNull.Value },
				{ "onNull", BsonNull.Value }
			})
		});
	}
}
