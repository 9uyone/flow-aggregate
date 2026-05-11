using Common.Contracts;
using Common.Contracts.Events;
using Common.Extensions;
using Common.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;
using StorageService.Contracts;
using System.Text.RegularExpressions;

namespace StorageService.Services;

internal class CollectedDataService(IMongoRepository<DataCollectedEvent> repo) {
	public async Task<PagedResponse<CollectedDataDto>> GetAsync(
		Guid userId,
		Guid? correlationId,
		Guid? configId,
		int? page,
		int? pageSize,
		bool? oldFirst,
		string? parserSlug,
		DateTime? from,
		DateTime? to,
		string? search) {
		var filter = BuildFilter(userId, correlationId, configId, parserSlug, from, to, search);
		var sort = oldFirst == true
			? Builders<DataCollectedEvent>.Sort.Ascending(x => x.Timestamp)
			: Builders<DataCollectedEvent>.Sort.Descending(x => x.Timestamp);

		var (results, totalCount) = await repo.FindAsync(filter, sort, page, pageSize);
		var actualPage = Math.Max(page ?? 1, 1);
		var actualPageSize = PagedExtensions.GetActualPageSize(pageSize);

		var items = results.Select(MapToDto).ToList();
		return items.ToPagedResponse(totalCount, actualPage, actualPageSize);
	}

	public async Task<List<CollectedDataDto>> GetByIdAsync(Guid userId, Guid id) {
		var result = await repo.GetByIdAsync(id);
		if (result == null || result.UserId != userId)
			return [];

		return [MapToDto(result)];
	}

	private static FilterDefinition<DataCollectedEvent> BuildFilter(
		Guid userId,
		Guid? correlationId,
		Guid? configId,
		string? parserSlug,
		DateTime? from,
		DateTime? to,
		string? search) {
		var filters = new List<FilterDefinition<DataCollectedEvent>> {
			Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId)
		};

		if (correlationId.HasValue)
			filters.Add(Builders<DataCollectedEvent>.Filter.Eq(x => x.CorrelationId, correlationId.Value));

		if (configId.HasValue)
			filters.Add(Builders<DataCollectedEvent>.Filter.Eq(x => x.ConfigId, configId.Value));

		if (from.HasValue)
			filters.Add(Builders<DataCollectedEvent>.Filter.Gte(x => x.CapturedAt, from.Value));

		if (to.HasValue)
			filters.Add(Builders<DataCollectedEvent>.Filter.Lte(x => x.CapturedAt, to.Value));

		if (!string.IsNullOrWhiteSpace(parserSlug)) {
			var parserRegex = new BsonRegularExpression(Regex.Escape(parserSlug.Trim()), "i");
			filters.Add(Builders<DataCollectedEvent>.Filter.Regex(x => x.ParserSlug, parserRegex));
		}

		if (!string.IsNullOrWhiteSpace(search)) {
			var searchRegex = new BsonRegularExpression(Regex.Escape(search.Trim()), "i");
			filters.Add(Builders<DataCollectedEvent>.Filter.Or(
				Builders<DataCollectedEvent>.Filter.Regex(x => x.ParserSlug, searchRegex),
				Builders<DataCollectedEvent>.Filter.Regex(x => x.Source, searchRegex),
				Builders<DataCollectedEvent>.Filter.Regex(x => x.Metric, searchRegex),
				Builders<DataCollectedEvent>.Filter.Regex(x => x.Category, searchRegex),
				Builders<DataCollectedEvent>.Filter.Regex(x => x.RawContent, searchRegex)
			));
		}

		return Builders<DataCollectedEvent>.Filter.And(filters);
	}

	private static CollectedDataDto MapToDto(DataCollectedEvent x) => new() {
		Id = x.Id,
		CorrelationId = x.CorrelationId,
		ParserName = x.ParserSlug,
		Source = x.Source,
		Metric = x.Metric,
		Timestamp = x.Timestamp,
		CapturedAt = x.CapturedAt,
		Value = x.Value,
		Type = x.Category,
		Metadata = x.Metadata,
		ConfigId = x.ConfigId,
	};
}
