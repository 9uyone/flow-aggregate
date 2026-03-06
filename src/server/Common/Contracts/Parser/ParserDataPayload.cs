namespace Common.Contracts.Parser;

public class ParserDataPayload {
	public required string Category { get; set; }
	public required string Source { get; set; } // e.g. api.openweathermap.org
	public required string Metric { get; set; }      // "USD_UAH", "AirTemperature"
	public DateTime CapturedAt { get; set; } = DateTime.UtcNow;

	public decimal? Value { get; set; } = null; // Numeric value (if applicable)
	public string? RawContent { get; set; } // Text content (if applicable)
	public Dictionary<string, string>? Metadata { get; set; } = new(); // Additional data
}