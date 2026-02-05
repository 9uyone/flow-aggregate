namespace StorageService.Contracts;

public class ParserUserConfigPatchDto {
	public string? CronExpression { get; init; }
	public bool? IsEnabled { get; init; }
	public IDictionary<string, string>? Options { get; init; }
}