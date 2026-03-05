using System.ComponentModel.DataAnnotations;

namespace StorageService.Contracts.ParserUserConfig;

internal class UserConfigCreateExternalDto {
	[MinLength(3)]
	[MaxLength(100)]
	public required string ParserSlug { get; init; }
	public bool IsEnabled { get; init; } = true;
}
