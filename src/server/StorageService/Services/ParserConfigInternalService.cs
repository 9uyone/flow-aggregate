using Common.Constants;
using Common.Contracts;
using Common.Contracts.ParserConfig;
using Common.Entities;
using Common.Interfaces;
using MongoDB.Driver;
using StorageService.Entities;

namespace StorageService.Services;

internal class ParserConfigInternalService(IMongoRepository<ParserUserConfig> repo, IMongoDatabase mongoDb) {
	public async Task<ParserFullContextDto?> GetFullContextAsync(Guid configId) {
		var userConfigs = mongoDb.GetCollection<ParserUserConfig>(MongoCollections.ParserUserConfigs);
		var definitions = mongoDb.GetCollection<ParserDefinition>(MongoCollections.ParserDefinitions);

		var pipeline = userConfigs.Aggregate()
			.Match(c => c.Id == configId)
			.Lookup<ParserUserConfig, ParserDefinition, ParserFullContextDto>(
				definitions,
				c => c.ParserSlug,
				d => d.Slug,
				res => res.Definition
			)
			.Unwind<ParserFullContextDto, ParserFullContextDto>(res => res.Definition);

		return await pipeline.FirstOrDefaultAsync();
	}

	public async Task<ParserConfigDto?> GetByTokenHashAsync(string tokenHash) {
		var (configs, _) = await repo.FindAsync(c => c.External!.TokenHash.Equals(tokenHash, StringComparison.OrdinalIgnoreCase));
		return configs.FirstOrDefault() is { } config ? MapToDto(config) : null;
	}

	public async Task<(IEnumerable<ParserConfigDto> configs, int totalCount)> GetActiveInternalConfigsAsync(
		int page, int pageSize) {
		var definitions = mongoDb.GetCollection<ParserDefinition>(MongoCollections.ParserDefinitions);
		var allowedSlugs = await definitions.Find(x => x.SupportsScheduledRun)
			.Project(x => x.Slug)
			.ToListAsync();

		if (allowedSlugs.Count == 0)
			return (Enumerable.Empty<ParserConfigDto>(), 0);

		var filter = Builders<ParserUserConfig>.Filter.Eq(x => x.IsEnabled, true)
			& Builders<ParserUserConfig>.Filter.Ne(x => x.Internal.CronExpression, null)
			& Builders<ParserUserConfig>.Filter.In(x => x.ParserSlug, allowedSlugs);

		var sort = Builders<ParserUserConfig>.Sort.Descending(x => x.Timestamp);
		var (items, totalCount) = await repo.FindAsync(filter, sort, page, pageSize);
		return (items.Select(MapToDto), totalCount);
	}

	private static ParserConfigDto MapToDto(ParserUserConfig config) => new() {
		Id = config.Id,
		UserId = config.UserId,
		ParserName = config.ParserSlug,
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
