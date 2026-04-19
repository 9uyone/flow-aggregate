using Common.Entities;
using Common.Enums;
using Common.Exceptions;
using Common.Interfaces;
using MongoDB.Driver;
using StorageService.Contracts.ParserCatalog;
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
				x.MetricFields?.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(v => v).ToArray() ?? [],
				x.Dimensions?.Where(v => !string.IsNullOrWhiteSpace(v)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(v => v).ToArray() ?? [],
				x.SupportsScheduledRun,
				x.SupportsManualRun,
				x.SupportsPushIngest,
				x.SupportsParameters,
				x.SourceType == ParserSourceType.External && x.OwnerUserId == userId)).ToList();
	}

	public async Task<ParserCatalogItemDto> UpsertExternalAsync(Guid userId, UpsertExternalParserDefinitionDto dto) {
		var slug = dto.Slug.Trim();
		var existing = await FindDefinitionBySlugAsync(slug);

		if (existing is not null && existing.SourceType != ParserSourceType.External)
			throw new BadRequestException($"Parser slug '{slug}' is already used by non-external parser");

		if (existing is not null && existing.OwnerUserId != null && existing.OwnerUserId != userId)
			throw new BadRequestException($"External parser slug '{slug}' belongs to another user");

		var metricFields = dto.MetricFields
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Select(x => x.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(x => x)
			.ToArray();

		var dimensions = dto.Dimensions
			.Where(x => !string.IsNullOrWhiteSpace(x))
			.Select(x => x.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(x => x)
			.ToArray();

		var displayName = dto.DisplayName.Trim();
		var description = dto.Description?.Trim() ?? string.Empty;

		if (existing is null) {
			await definitionsRepo.CreateAsync(new ParserDefinition {
				Slug = slug,
				DisplayName = displayName,
				Description = description,
				MetricFields = metricFields,
				Dimensions = dimensions,
				SourceType = ParserSourceType.External,
				SupportsPushIngest = true,
				SupportsManualRun = false,
				SupportsScheduledRun = false,
				SupportsParameters = false,
				OwnerUserId = userId,
				UpdatedAt = DateTime.UtcNow,
			});
		}
		else {
			var update = Builders<ParserDefinition>.Update
				.Set(x => x.DisplayName, displayName)
				.Set(x => x.Description, description)
				.Set(x => x.MetricFields, metricFields)
				.Set(x => x.Dimensions, dimensions)
				.Set(x => x.SupportsPushIngest, true)
				.Set(x => x.SupportsManualRun, false)
				.Set(x => x.SupportsScheduledRun, false)
				.Set(x => x.SupportsParameters, false)
				.Set(x => x.UpdatedAt, DateTime.UtcNow)
				.Set(x => x.OwnerUserId, userId);

			await definitionsRepo.UpdateOneAsync(x => x.Slug == slug, update);
		}

		var saved = await FindDefinitionBySlugAsync(slug);
		if (saved is null)
			throw new InvalidOperationException("Failed to upsert external parser definition");

		return new ParserCatalogItemDto(
			saved.Slug,
			saved.DisplayName,
			saved.Description,
			saved.SourceType.ToString(),
			saved.MetricFields?.ToArray() ?? [],
			saved.Dimensions?.ToArray() ?? [],
			saved.SupportsScheduledRun,
			saved.SupportsManualRun,
			saved.SupportsPushIngest,
			saved.SupportsParameters,
			true);
	}

	private async Task<ParserDefinition?> FindDefinitionBySlugAsync(string slug) {
		var (items, _) = await definitionsRepo.FindAsync(x => x.Slug == slug, page: 1, pageSize: 1, oldFirst: false);
		return items.FirstOrDefault();
	}
}
