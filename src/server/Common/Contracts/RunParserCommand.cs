namespace Common.Contracts;

public class RunParserCommand: ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public string ConfigId { get; set; } = string.Empty;
	public string ParserName { get; set; } = string.Empty;
	public string UserId { get; set; } = string.Empty;
	public IDictionary<string, string> Options { get; init; } = new Dictionary<string, string>();
}
