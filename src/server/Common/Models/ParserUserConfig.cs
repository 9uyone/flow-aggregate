namespace Common.Models;

public class ParserUserConfig: BaseEntity {
	public string UserId { get; init; } = string.Empty;

	// from /collector/run/{name}
	public string ParserName { get; init; } = string.Empty;

	public string TargetUrl { get; init; } = string.Empty;

	public string CronExpression { get; init; } = string.Empty;
	public bool IsEnabled { get; init; } = true;

	// from body of /collector/run/{name}
	public IDictionary<string, string> Options { get; init; } = new Dictionary<string, string>();

	public DateTime? LastRunUtc { get; set; }
}