/*using Common.Attributes;
using Common.Enums;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Models;

namespace CollectorService.Parsers.OpenWeather;

[ParserInfo("openWeather", "Current weather by city name", DataType.Weather)]
[ParserParameter("city", "Name of the city (e.g. Lviv, Kyiv)", isRequired: true)]
[ParserParameter("units", "metric or imperial", false)]
public class WeatherParser(IHttpRestClient httpClient, IConfiguration config) : IDataParser {
	private readonly string _apiKey = config["Parsers:Weather:ApiKey"] ?? "";

	public async Task<InboundDataDto> ParseAsync(IDictionary<string, string> parameters) {
		var city = parameters.GetValueOrDefault("city", "Lviv");
		var units = parameters.GetValueOrDefault("units", "metric");

		// 1. Отримуємо координати
		var geoUrl = $"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={_apiKey}";
		var geoResult = await httpClient.GetAsync<List<GeoModel>>(geoUrl);
		var location = geoResult?.FirstOrDefault() ?? throw new Exception("City not found");

		// 2. Отримуємо погоду
		var weatherUrl = $"https://api.openweathermap.org/data/2.5/weather?lat={location.Lat}&lon={location.Lon}&units={units}&appid={_apiKey}";
		var weather = await httpClient.GetAsync<WeatherResponse>(weatherUrl);

		return new InboundDataDto {
			Source = "openweathermap.org",
			Metric = $"weather_{city.ToLower()}",
			Value = (decimal)weather.Main.Temp,
			Metadata = new Dictionary<string, string> {
				["Description"] = weather.Weather[0].Description,
				["Humidity"] = weather.Main.Humidity.ToString(),
				["WindSpeed"] = weather.Wind.Speed.ToString()
			}
		};
	}
}*/