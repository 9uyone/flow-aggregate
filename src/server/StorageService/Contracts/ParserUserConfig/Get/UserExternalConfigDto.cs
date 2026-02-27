namespace StorageService.Contracts.ParserUserConfig.Get;

internal class UserExternalConfigDto: UserConfigBaseDto {
	public required string TokenHash { get; init; }
}