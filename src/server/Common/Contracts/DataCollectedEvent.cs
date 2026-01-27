using Common.Enums;
using Common.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Contracts;

public class DataCollectedEvent: BaseEntity {
	public required string ParserName { get; set; } // e.g. OpenWeatherMapParser
	public required string UserId { get; set; } // Who requested the data
	public required string Source { get; init; } // e.g. api.openweathermap.org

	public decimal? Value { get; init; } // Numeric value (if applicable)
	public string? RawContent { get; init; } // Text content (if applicable)

	[BsonRepresentation(BsonType.String)]
	public required DataType Type { get; set; } // "Price", "Temperature", "Stock"

	public Dictionary<string, string>? Metadata { get; init; } // Additional data
};