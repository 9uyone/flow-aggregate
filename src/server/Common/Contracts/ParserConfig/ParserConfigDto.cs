namespace Common.Contracts.ParserConfig;

public class ParserConfigDto {
	public Guid Id { get; init; }
	public Guid UserId { get; init; }
	public required string ParserName { get; init; }
	public bool IsEnabled { get; init; }
	public ParserInternalOptionsDto? Internal { get; init; }
	public ParserExternalOptionsDto? External { get; init; }
}

public class ParserInternalOptionsDto {
	public string? CustomName { get; init; }
	public required string CronExpression { get; init; }
	public IDictionary<string, string>? Options { get; init; }
}

public class ParserExternalOptionsDto {
	public required string TokenHash { get; init; }
}
