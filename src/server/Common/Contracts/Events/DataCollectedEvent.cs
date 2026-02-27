using Common.Entities;
using Common.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Contracts.Events;

public class DataCollectedEvent: BaseEntity, ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public required string ParserName { get; set; } // e.g. OpenWeatherMapParser
	public required string Category { get; set; } // "Price", "Temperature", "Stock"
	public required string Source { get; init; } // e.g. api.openweathermap.org
	public required string Metric { get; set; }

	public decimal? Value { get; init; } // Numeric value (if applicable)
	public string? RawContent { get; init; } // Text content (if applicable)
	public Dictionary<string, string>? Metadata { get; init; } // Additional data

	public required Guid UserId { get; set; } // Who requested the data
	public Guid? ConfigId { get; set; } // Related ParserUserConfig ID
};