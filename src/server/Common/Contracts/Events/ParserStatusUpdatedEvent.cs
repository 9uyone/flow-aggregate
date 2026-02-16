namespace Common.Contracts.Events;

public record ParserStatusUpdatedEvent : ICorrelatedMessage {
	public Guid ConfigId { get; init; }
	public Guid? CorrelationId { get; set; }
	public bool IsSuccess { get; init; }
	public string? ErrorMessage { get; init; }
	public DateTime FinishedAtUtc { get; init; }
}