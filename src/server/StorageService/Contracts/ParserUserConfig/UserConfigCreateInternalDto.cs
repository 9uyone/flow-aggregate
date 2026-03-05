using System.ComponentModel.DataAnnotations;

namespace StorageService.Contracts.ParserUserConfig;

internal class UserConfigCreateInternalDto {
	[MinLength(3)]
	[MaxLength(100)]
	public required string ParserSlug { get; init; }
	public bool IsEnabled { get; init; } = true;

	public string? CustomName { get; init; }
	public required string CronExpression { get; init; }
	public  IDictionary<string, string>? Options { get; init; }
}