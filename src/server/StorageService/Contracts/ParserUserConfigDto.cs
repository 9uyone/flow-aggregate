namespace StorageService.Contracts;

public class ParserUserConfigDto {
	// from /collector/run/{name}
	public required string ParserName { get; init; }

	public string TargetUrl { get; set; } = string.Empty;

	public required string CronExpression { get; set; }
	public bool IsEnabled { get; set; } = true;

	// from body of /collector/run/{name}
	public IDictionary<string, string> Options { get; set; } = new Dictionary<string, string>();
}