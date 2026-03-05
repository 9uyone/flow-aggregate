namespace Common.Enums;

using System.Text.Json.Serialization;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ParserSourceType {
	Internal,
	Plugin,
	External
}