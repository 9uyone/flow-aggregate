using System.Text.Json.Serialization;

namespace StorageService.Contracts.ParserUserConfig.Get;

[JsonDerivedType(typeof(UserInternalConfigDto), typeDiscriminator: "internal")]
[JsonDerivedType(typeof(UserExternalConfigDto), typeDiscriminator: "external")]
internal abstract class UserConfigBaseDto {
	public required string ParserName { get; init; }

	public required bool IsEnabled { get; init; }
	public required DateTime? LastRunUtc { get; init; }
	public required string? LastStatus { get; init; }
	public required string? LastErrorMessage { get; init; }
}