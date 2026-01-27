using Common.Attributes;
using Common.Enums;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Models;
using Common.Exceptions;
using Common.Constants;

namespace CollectorService.Parsers.OpenWeather;

[ParserInfo("openWeather", "Current weather by city name", DataType.Weather)]
[ParserParameter("city", "City name", isRequired: true)]
[ParserParameter("units", "metric or imperial", false)]
public class WeatherParser(IHttpRestClient httpClient, IConfiguration config) : IDataParser {
	private readonly string _apiKey = config["Parsers:OpenWeather:ApiKey"]
		?? throw new InvalidOperationException("OpenWeather API Key is missing in configuration.");

	public async Task<InboundDataDto> ParseAsync(IDictionary<string, string> parameters) {
		var city = parameters.GetValueOrDefault("valcode", "Lviv");
		var units = parameters.GetValueOrDefault("units", "metric");
		var encodedCity = Uri.EscapeDataString(city);

		var geoUrl = $"http://api.openweathermap.org/geo/1.0/direct?q={encodedCity}&limit=1&appid={_apiKey}";
		var geoResult = await httpClient.GetAsync<List<GeoModel>>(geoUrl);

		var location = geoResult?.FirstOrDefault()
			?? throw new NotFoundException($"City '{city}' not found in OpenWeather database.");

		var weatherUrl = $"https://api.openweathermap.org/data/2.5/weather?lat={location.Lat}&lon={location.Lon}&units={units}&appid={_apiKey}";
		var weather = await httpClient.GetAsync<WeatherResponse>(weatherUrl)
			?? throw new ExternalServiceException("Failed to retrieve weather data from OpenWeather API.");

		return new InboundDataDto {
			Source = "openweathermap.org",
			Metric = $"weather_{city.ToLower().Replace(" ", "_")}",
			Value = (decimal)weather.Main.Temp,
			Metadata = new Dictionary<string, string> {
				[MetadataKeys.Provider] = "OpenWeatherMap",
				["description"] = weather.Weather.FirstOrDefault()?.Description ?? "No description",
				["humidity"] = $"{weather.Main.Humidity}%",
				["windSpeed"] = $"{weather.Wind.Speed} m/s",
				["location"] = $"{location.Name}, {location.Country}"
			}
		};
	}

	// Default cities
	public Task<IEnumerable<LookupOptionDto>> GetParameterLookupsAsync(string parameterName) {
		if (parameterName == "city") {
			return Task.FromResult<IEnumerable<LookupOptionDto>>(new List<LookupOptionDto>
			{
				new("Lviv", "Львів"),
				new("Kyiv", "Київ"),
				new("Odesa", "Одеса")
			});
		}
		return Task.FromResult(Enumerable.Empty<LookupOptionDto>());
	}
}