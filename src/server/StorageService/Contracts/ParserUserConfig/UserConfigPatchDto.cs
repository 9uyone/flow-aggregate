namespace StorageService.Contracts.ParserUserConfig;

public class UserConfigPatchDto {
	// all
	public bool? IsEnabled { get; init; }

	// only internal
	public string? CronExpression { get; init; }
	public IDictionary<string, string>? Options { get; init; }
}