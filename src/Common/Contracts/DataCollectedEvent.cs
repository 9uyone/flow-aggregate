namespace Common.Contracts;

public record DataCollectedEvent(
	Guid Id,
	string Value,
	DateTime Timestamp,
	Dictionary<string, string>? Metadata = null
);