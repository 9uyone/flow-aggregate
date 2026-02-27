namespace Common.Contracts.Events;

public record ParserStatusUpdatedEvent : ICorrelatedMessage {
	public required Guid ConfigId { get; init; }
	public Guid? CorrelationId { get; set; }
	public required Guid UserId { get; set; }

	public required string ParserName { get; init; }
	//public required string Source { get; init; }

	public required bool IsSuccess { get; init; }
	public string? ErrorMessage { get; init; }
	public required DateTime FinishedAtUtc { get; init; }

	public IDictionary<string, string>? Options { get; init; }
}