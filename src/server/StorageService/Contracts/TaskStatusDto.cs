namespace StorageService.Contracts;

public class TaskStatusDto {
	public required Guid CorrelationId { get; init; }
	public required string Status { get; init; }
	public string? ErrorMessage { get; init; }
}
