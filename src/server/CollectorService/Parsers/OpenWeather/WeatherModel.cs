using System.Text.Json.Serialization;

namespace CollectorService.Parsers.OpenWeather;

public record WeatherResponse(
	[property: JsonPropertyName("main")] MainInfo Main,
	[property: JsonPropertyName("weather")] List<WeatherDescription> Weather,
	[property: JsonPropertyName("wind")] WindInfo Wind);

public record MainInfo([property: JsonPropertyName("temp")] double Temp, [property: JsonPropertyName("humidity")] int Humidity);
public record WeatherDescription([property: JsonPropertyName("description")] string Description);
public record WindInfo([property: JsonPropertyName("speed")] double Speed);