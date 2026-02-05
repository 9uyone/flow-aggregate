namespace StorageService.Contracts;

public class ParserUserConfigDto {
	// from /collector/run/{name}
	public required string ParserName { get; init; }

	public string TargetUrl { get; init; } = string.Empty;

	public required string CronExpression { get; init; }
	public bool IsEnabled { get; init; } = true;

	// from body of /collector/run/{name}
	public IDictionary<string, string>? Options { get; init; } = new Dictionary<string, string>();
}