namespace Gateway.Models;


public record InboundDataDto(
	string Source, // "Rozetka", "WeatherApi", "Sensor_1"
	string DataType, // "Price", "Temperature", "Stock"
	decimal Value,
	Dictionary<string, string>? Metadata // Additional data
);