using System.ComponentModel.DataAnnotations;

namespace StorageService.Contracts.ParserUserConfig;

internal class UpsertExternalConfigWithDefinitionDto {
	[MinLength(3)]
	[MaxLength(100)]
	public required string Slug { get; init; }

	[MinLength(1)]
	[MaxLength(120)]
	public required string DisplayName { get; init; }

	[MaxLength(1000)]
	public string? Description { get; init; }

	public string[] MetricFields { get; init; } = [];
	public string[] Dimensions { get; init; } = [];
	public bool IsEnabled { get; init; } = true;
}
