namespace StorageService.Contracts.ParserUserConfig.Get;

internal class UserInternalConfigDto: UserConfigBaseDto {
	public required string CronExpression { get; init; }
	public required IDictionary<string, string>? Options { get; init; }
}