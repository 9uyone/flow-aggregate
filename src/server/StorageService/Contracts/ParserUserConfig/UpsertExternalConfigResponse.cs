namespace StorageService.Contracts.ParserUserConfig;

internal class UpsertExternalConfigResponse {
	public required Guid ConfigId { get; init; }
	public string? Token { get; init; }
	public required bool IsCreated { get; init; }
}
