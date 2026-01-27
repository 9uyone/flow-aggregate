using System.Text.Json.Serialization;

namespace CollectorService.Parsers.OpenWeather;

public record GeoModel(
	[property: JsonPropertyName("name")] string Name,
	[property: JsonPropertyName("lat")] double Lat,
	[property: JsonPropertyName("lon")] double Lon,
	[property: JsonPropertyName("country")] string Country);