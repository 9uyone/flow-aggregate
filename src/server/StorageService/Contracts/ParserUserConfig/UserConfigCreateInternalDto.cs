using System.ComponentModel.DataAnnotations;

namespace StorageService.Contracts.ParserUserConfig;

internal class UserConfigCreateInternalDto {
	[MinLength(3)]
	[MaxLength(100)]
	public required string ParserName { get; init; }
	public bool IsEnabled { get; init; } = true;

	public required string CronExpression { get; init; }
	public required IDictionary<string, string>? Options { get; init; }
}