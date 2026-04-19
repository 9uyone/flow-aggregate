using Common.Entities;
using Common.Enums;
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
	bool SupportsParameters);

internal class ParserCatalogService(IMongoRepository<ParserDefinition> definitionsRepo, IMongoRepository<ParserUserConfig> configsRepo) {
	public async Task<IReadOnlyList<ParserCatalogItemDto>> GetAllAsync(Guid userId) {
		var definitions = await definitionsRepo.FindAllAsync(Builders<ParserDefinition>.Filter.Empty, Builders<ParserDefinition>.Sort.Ascending(x => x.DisplayName));
		var (externalConfigs, _) = await configsRepo.FindAsync(x => x.SourceType == ParserSourceType.External && x.UserId == userId, page: 1, pageSize: 5000, oldFirst: false);

		var externalSlugs = externalConfigs
			.Select(x => x.ParserSlug)
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		foreach (var slug in externalSlugs) {
			if (definitions.Any(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase)))
				continue;

			definitions.Add(new ParserDefinition {
				Slug = slug,
				DisplayName = slug,
				Description = "External parser",
				SourceType = ParserSourceType.External,
				SupportsPushIngest = true,
				SupportsManualRun = false,
				SupportsScheduledRun = false,
				SupportsParameters = false,
				UpdatedAt = DateTime.UtcNow,
			});
		}

		return definitions
			.OrderBy(x => x.DisplayName)
			.Select(x => new ParserCatalogItemDto(
				x.Slug,
				x.DisplayName,
				x.Description,
				x.SourceType.ToString(),
				x.MetricFields?.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(v => v).ToArray() ?? [],
				x.Dimensions?.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(v => v).ToArray() ?? [],
				x.SupportsScheduledRun,
				x.SupportsManualRun,
				x.SupportsPushIngest,
				x.SupportsParameters)).ToList();
	}
}
