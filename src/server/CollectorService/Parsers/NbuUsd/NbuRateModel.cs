using System.Text.Json.Serialization;

namespace CollectorService.Parsers.NbuUsd;

internal class NbuRateModel {
	[JsonPropertyName("rate")]
	public decimal Rate { get; set; }

	[JsonPropertyName("exchangedate")]
	public string ExchangeDate { get; set; }

	[JsonPropertyName("cc")]
	public string CurrencyCode { get; set; }

	[JsonPropertyName("txt")]
	public string CurrencyName { get; set; }
}