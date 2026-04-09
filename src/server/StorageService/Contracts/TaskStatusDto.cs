namespace StorageService.Contracts;

public class TaskStatusDto {
	public required Guid CorrelationId { get; init; }
	public string? ParserSlug { get; init; }
	public IDictionary<string, string>? ParserOptions { get; init; }
	public required string Status { get; init; }
	public string? ErrorMessage { get; init; }
	public DateTime? StartedAt { get; init; }
	public DateTime? FinishedAt { get; init; }
	public int RecordsCount { get; set; }
}
