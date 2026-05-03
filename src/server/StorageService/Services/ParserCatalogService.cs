using Common.Entities;
using Common.Enums;
using Common.Exceptions;
using Common.Interfaces;
using MongoDB.Driver;
using StorageService.Entities;

namespace StorageService.Services;

public sealed record ParserCatalogItemDto(
	string Slug,
	string DisplayName,
	string Description,
	string SourceType,
	string[] MetricFields,
	string[] Dimensions,
	bool SupportsScheduledRun,
	bool SupportsManualRun,
	bool SupportsPushIngest,
	bool SupportsParameters,
	bool IsExternalOwnedByCurrentUser);

internal class ParserCatalogService(IMongoRepository<ParserDefinition> definitionsRepo, IMongoRepository<ParserUserConfig> configsRepo) {
	private static string[] NormalizeStrings(IEnumerable<string>? items) =>
		items?.Where(v => !string.IsNullOrWhiteSpace(v))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(v => v)
			.ToArray() ?? [];

	public async Task<IReadOnlyList<ParserCatalogItemDto>> GetAllAsync(Guid userId) {
		var definitions = await definitionsRepo.FindAllAsync(Builders<ParserDefinition>.Filter.Empty, Builders<ParserDefinition>.Sort.Ascending(x => x.DisplayName));
		var (externalConfigs, _) = await configsRepo.FindAsync(x => x.SourceType == ParserSourceType.External && x.UserId == userId, page: 1, pageSize: 5000, oldFirst: false);
		var externalSlugs = externalConfigs
			.Select(x => x.ParserSlug)
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToHashSet(StringComparer.OrdinalIgnoreCase);

		return definitions
			.Where(x => x.SourceType != ParserSourceType.External || x.OwnerUserId == null || x.OwnerUserId == userId || externalSlugs.Contains(x.Slug))
			.OrderBy(x => x.DisplayName)
			.Select(x => new ParserCatalogItemDto(
				x.Slug,
				x.DisplayName,
				x.Description,
				x.SourceType.ToString(),
				NormalizeStrings(x.MetricFields),
				NormalizeStrings(x.Dimensions),
				x.SupportsScheduledRun,
				x.SupportsManualRun,
				x.SupportsPushIngest,
				x.SupportsParameters,
				x.SourceType == ParserSourceType.External && x.OwnerUserId == userId)).ToList();
	}


	public async Task<ParserDefinition> GetDefinitionAsync(string slug, Guid userId) {
		var definition = await FindDefinitionBySlugAsync(slug);
		if (definition is null)
			throw new NotFoundException($"Parser '{slug}' not found.");

		if (definition.SourceType == ParserSourceType.External && definition.OwnerUserId != null && definition.OwnerUserId != userId) {
			var hasExternalConfig = await configsRepo.AnyAsync(x =>
				x.SourceType == ParserSourceType.External && x.UserId == userId && x.ParserSlug == slug);
			if (!hasExternalConfig)
				throw new NotFoundException($"Parser '{slug}' not found.");
		}

		return definition;
	}

	private async Task<ParserDefinition?> FindDefinitionBySlugAsync(string slug) {
		var (items, _) = await definitionsRepo.FindAsync(x => x.Slug == slug, page: 1, pageSize: 1, oldFirst: false);
		return items.FirstOrDefault();
	}
}
