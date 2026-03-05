using Common.Entities;
using Common.Interfaces;

namespace Common.Contracts.Events;

public class DataCollectedEvent: BaseEntity, ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public required string ParserSlug { get; set; } // e.g. open-weather-parser
	public required string Category { get; set; } // "Price", "Temperature", "Stock"
	public required string Source { get; init; } // e.g. api.openweathermap.org
	public required string Metric { get; set; }
	public DateTime CapturedAtUtc { get; set; } = DateTime.UtcNow;

	public decimal? Value { get; init; } // Numeric value (if applicable)
	public string? RawContent { get; init; } // Text content (if applicable)
	public Dictionary<string, string>? Metadata { get; init; } // Additional data

	public required Guid UserId { get; set; } // Who requested the data
	public Guid? ConfigId { get; set; } // Related ParserUserConfig ID
};