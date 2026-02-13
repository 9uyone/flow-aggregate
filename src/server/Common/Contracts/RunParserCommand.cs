namespace Common.Contracts;

public class RunParserCommand: ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public string? ConfigId { get; set; }
	public required string ParserName { get; set; }
	public required string UserId { get; set; }
	public IDictionary<string, string> Options { get; init; } = new Dictionary<string, string>();
}
