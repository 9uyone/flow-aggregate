namespace StorageService.Contracts;

public class TaskStatusDto {
	public required string Status { get; init; }
	public string? ErrorMessage { get; init; }
}
