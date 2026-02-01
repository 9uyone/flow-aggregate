namespace Common.Models;

public class ParserConfig: BaseEntity {
	public string UserId { get; set; } = string.Empty;

	// from /collector/run/{name}
	public string ParserName { get; set; } = string.Empty;

	public string TargetUrl { get; set; } = string.Empty;

	public string CronExpression { get; set; } = string.Empty;
	public bool IsEnabled { get; set; } = true;

	// from body of /collector/run/{name}
	public IDictionary<string, string> Options { get; set; } = new Dictionary<string, string>();

	public DateTime? LastRunUtc { get; set; }
}