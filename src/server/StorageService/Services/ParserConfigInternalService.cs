using Common.Contracts.ParserConfig;
using Common.Entities;
using Common.Enums;
using Common.Interfaces;

namespace StorageService.Services;

internal class ParserConfigInternalService(IMongoRepository<ParserUserConfig> repo) {
	public async Task<ParserConfigDto?> GetByTokenHashAsync(string tokenHash) {
		var (configs, _) = await repo.FindAsync(c => c.External!.TokenHash == tokenHash);
		return configs.FirstOrDefault() is { } config ? MapToDto(config) : null;
	}

	public async Task<(IEnumerable<ParserConfigDto> configs, int totalCount)> GetActiveInternalConfigsAsync(
		int page, int pageSize)
	{
		var (configs, totalCount) = await repo.FindAsync(
			c => c.IsEnabled == true && c.SourceType == ParserSourceType.Internal,
			page, pageSize);
		return (configs.Select(MapToDto), totalCount);
	}

	private static ParserConfigDto MapToDto(ParserUserConfig config) => new() {
		Id = config.Id,
		UserId = config.UserId,
		ParserName = config.ParserName,
		IsEnabled = config.IsEnabled,
		Internal = config.Internal == null ? null : new ParserInternalOptionsDto {
			CustomName = config.Internal.CustomName,
			CronExpression = config.Internal.CronExpression,
			Options = config.Internal.Options,
		},
		External = config.External == null ? null : new ParserExternalOptionsDto {
			TokenHash = config.External.TokenHash,
		}
	};
}