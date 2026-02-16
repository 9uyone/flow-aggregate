namespace Common.Contracts;

public class RunParserCommand: ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public Guid? ConfigId { get; init; }
	public required string ParserName { get; init; }
	public required Guid UserId { get; init; }
	public IDictionary<string, string>? Options { get; init; }
}
