namespace Common.Entities;

public class ParserUserConfig: BaseEntity {
	public Guid UserId { get; init; } = Guid.Empty;

	// from /collector/run/{name}
	public string ParserName { get; init; } = string.Empty;

	public string TargetUrl { get; init; } = string.Empty;

	public string CronExpression { get; init; } = string.Empty;
	public bool IsEnabled { get; init; } = true;

	// from body of /collector/run/{name}
	public IDictionary<string, string> Options { get; init; } = new Dictionary<string, string>();

	public DateTime? LastRunUtc { get; set; }
	public bool? LastStatus { get; set; }
	public string? LastErrorMessage { get; set; }
}