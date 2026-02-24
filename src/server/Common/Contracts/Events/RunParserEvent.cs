namespace Common.Contracts.Events;

public class RunParserEvent: ICorrelatedMessage {
	public Guid? CorrelationId { get; set; }

	public Guid? ConfigId { get; init; }
	public required string ParserName { get; init; }
	public required Guid UserId { get; init; }
	public IDictionary<string, string>? Options { get; init; }
}