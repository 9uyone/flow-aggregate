using Common.Interfaces.Parser;
using Microsoft.AspNetCore.WebUtilities;

namespace AnalyzeService.Services;

public sealed record HistoryPointDto(string Timestamp, double Value);

public sealed record HistoryQueryResult(bool Success, string? ErrorMessage, HistoryPointDto[]? Data);

public sealed record HistoryQueryRequest(
	string Slug,
	string Metric,
	string? Range,
	string? Interval,
	DateTime? From,
	DateTime? To,
	IReadOnlyDictionary<string, string>? Dimensions = null);

public interface IHistoryQueryService {
	Task<HistoryQueryResult> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
}

public sealed class HistoryQueryService(IHttpRestClient httpClient, AnalyticsCache cache) : IHistoryQueryService {
	public async Task<HistoryQueryResult> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(request.Metric))
			return new HistoryQueryResult(false, "Metric is required.", null);

		DateTime effectiveFrom;
		DateTime effectiveTo;
		string effectiveInterval;

		if (!string.IsNullOrWhiteSpace(request.Range)) {
			if (!AnalyticsTimeRangeResolver.TryResolvePreset(request.Range, out effectiveFrom, out effectiveTo, out effectiveInterval))
				return new HistoryQueryResult(false, "Range must be one of: day, week, month, quarter, year, all, all-time.", null);

			if (!string.IsNullOrWhiteSpace(request.Interval))
				effectiveInterval = request.Interval.Trim().ToLowerInvariant();
		}
		else {
			if (request.From is null || request.To is null)
				return new HistoryQueryResult(false, "from and to are required when range is not specified.", null);

			effectiveFrom = request.From.Value;
			effectiveTo = request.To.Value;
			effectiveInterval = string.IsNullOrWhiteSpace(request.Interval)
				? AnalyticsTimeRangeResolver.InferInterval(effectiveFrom, effectiveTo)
				: request.Interval.Trim().ToLowerInvariant();
		}

		if (!AnalyticsTimeRangeResolver.IsSupportedInterval(effectiveInterval))
			return new HistoryQueryResult(false, "Interval must be one of: hour, day, week, month.", null);

		if (effectiveFrom > effectiveTo)
			return new HistoryQueryResult(false, "'from' must be less than or equal to 'to'.", null);

		var query = new Dictionary<string, string?> {
			["metric"] = request.Metric,
			["interval"] = effectiveInterval,
			["from"] = effectiveFrom.ToString("O"),
			["to"] = effectiveTo.ToString("O")
		};

		if (request.Dimensions is not null)
			foreach (var dimension in request.Dimensions)
				query[dimension.Key] = dimension.Value;

		var cacheKey = AnalyticsCache.BuildKey("history", request.Slug, query);
		var data = await cache.GetOrCreateAsync(cacheKey, TimeSpan.FromMinutes(2), async () => {
			var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/history/{request.Slug}", query);
			return await httpClient.GetAsync<HistoryPointDto[]>(uri) ?? Array.Empty<HistoryPointDto>();
		}, cancellationToken);

		return new HistoryQueryResult(true, null, data ?? Array.Empty<HistoryPointDto>());
	}
}

