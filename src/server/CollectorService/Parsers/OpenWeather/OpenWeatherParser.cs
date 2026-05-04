using Common.Attributes;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Exceptions;
using Common.Constants;
using Common.Contracts.Parser;
using System.Globalization;

namespace CollectorService.Parsers.OpenWeather;

[ParserInfo("open-weather", "OpenWeather", "Get current weather by city name")]
[ParserParameter("city", "City name.", isRequired: true, allowCustomValues: true)]
[ParserParameter("units", "By default is Metric.", isRequired: false, allowCustomValues: false)]
[ParserMetrics("humidityPercent", "windSpeed")]
[ParserDimensions("city")]
public class OpenWeatherParser(IHttpRestClient httpClient, IConfiguration config) : IDataParser {
	private string ApiKey => config["Parsers:OpenWeather:ApiKey"]
		?? throw new InvalidOperationException("OpenWeather API Key is missing in configuration.");

	public async Task<IEnumerable<ParserDataPayload>> ParseAsync(IDictionary<string, string> parameters) {
		var units = parameters.GetValueOrDefault("units", "metric");
		var city = parameters["city"] 
			?? throw new ArgumentException("Parameter 'city' is required.");

		var encodedCity = Uri.EscapeDataString(city);

		var geoUrl = $"http://api.openweathermap.org/geo/1.0/direct?q={encodedCity}&limit=1&appid={ApiKey}";
		var geoResult = await httpClient.GetAsync<List<GeoModel>>(geoUrl);

		var location = geoResult?.FirstOrDefault()
			?? throw new NotFoundException($"City '{city}' not found in OpenWeather database.");

		var weatherUrl = $"https://api.openweathermap.org/data/2.5/weather?lat={location.Lat}&lon={location.Lon}&units={units}&appid={ApiKey}";
		var weather = await httpClient.GetAsync<WeatherResponse>(weatherUrl)
			?? throw new ExternalServiceException("Failed to retrieve weather data from OpenWeather API.");

		//await Task.Delay(5000);

		return [new ParserDataPayload {
			Category = "Temperature",
			Source = "openweathermap.org",
			Metric = $"temperature_{(units == "metric" ? "celsius" : "fahrenheit")}",
			Value = (decimal)weather.Main.Temp,
			Metadata = new Dictionary<string, string> {
				[MetadataKeys.Provider] = "OpenWeatherMap",
				["city"] = city.ToLower().Replace(" ", "_"),
				["description"] = weather.Weather.FirstOrDefault()?.Description ?? "No description",
				["humidityPercent"] = weather.Main.Humidity.ToString(CultureInfo.InvariantCulture),
				["windSpeed"] = weather.Wind.Speed.ToString(CultureInfo.InvariantCulture),
				["location"] = $"{location.Name}, {location.Country}"
			}
		}];
	}

	public Task<IEnumerable<LookupOptionDto>> GetParameterLookupsAsync(string parameterName) {
		if (parameterName == "city") {
			return Task.FromResult<IEnumerable<LookupOptionDto>>(new List<LookupOptionDto> // city examples
			{
				new("Lviv", "Львів"),
				new("Kyiv", "Київ"),
				new("Odesa", "Одеса")
			});
		} else if (parameterName == "units") {
			return Task.FromResult<IEnumerable<LookupOptionDto>>(new List<LookupOptionDto>
			{
				new("metric", "Metric (°C, m/s)"),
				new("imperial", "Imperial (°F, mph)")
			});
		}

		return Task.FromResult(Enumerable.Empty<LookupOptionDto>());
	}
}