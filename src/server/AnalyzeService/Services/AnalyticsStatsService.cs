using Common.Interfaces.Parser;
using Microsoft.AspNetCore.WebUtilities;

namespace AnalyzeService.Services;

public sealed record AnalyticsStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double FirstValue,
	double LastValue,
	double Delta,
	double? PercentChange,
	string? FirstTimestamp,
	string? LastTimestamp);

public sealed record AnalyticsStatsResult(bool Success, string? ErrorMessage, AnalyticsStatsDto? Data);

public sealed record StorageStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double FirstValue,
	double LastValue,
	string? FirstTimestamp,
	string? LastTimestamp);

public interface IAnalyticsStatsService {
	Task<AnalyticsStatsResult> GetStatsAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
}

public sealed class AnalyticsStatsService(IHttpRestClient httpClient, AnalyticsCache cache) : IAnalyticsStatsService {
	public async Task<AnalyticsStatsResult> GetStatsAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(request.Metric))
			return new AnalyticsStatsResult(false, "Metric is required.", null);

		DateTime from;
		DateTime to;

		if (!string.IsNullOrWhiteSpace(request.Range)) {
			if (!AnalyticsTimeRangeResolver.TryResolvePreset(request.Range, out from, out to, out _))
				return new AnalyticsStatsResult(false, "Range must be one of: day, week, month, quarter, year, all, all-time.", null);
		}
		else {
			if (request.From is null || request.To is null)
				return new AnalyticsStatsResult(false, "from and to are required when range is not specified.", null);

			from = request.From.Value;
			to = request.To.Value;
		}

		if (from > to)
			return new AnalyticsStatsResult(false, "'from' must be less than or equal to 'to'.", null);

		var query = new Dictionary<string, string?> {
			["metric"] = request.Metric,
			["from"] = from.ToString("O"),
			["to"] = to.ToString("O")
		};

		if (request.Dimensions is not null)
			foreach (var dimension in request.Dimensions)
				query[dimension.Key] = dimension.Value;

		var cacheKey = AnalyticsCache.BuildKey("stats", request.Slug, query);
		var stats = await cache.GetOrCreateAsync(cacheKey, TimeSpan.FromMinutes(2), async () => {
			var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/stats/{request.Slug}", query);
			return await httpClient.GetAsync<StorageStatsDto>(uri);
		}, cancellationToken);
		if (stats is null)
			return new AnalyticsStatsResult(true, null, new AnalyticsStatsDto(0, 0, 0, 0, 0, 0, 0, null, null, null));

		var delta = stats.LastValue - stats.FirstValue;
		double? percentChange = stats.FirstValue == 0 ? null : (delta / stats.FirstValue) * 100;

		return new AnalyticsStatsResult(true, null, new AnalyticsStatsDto(
			stats.Count,
			stats.Min,
			stats.Max,
			stats.Average,
			stats.FirstValue,
			stats.LastValue,
			delta,
			percentChange,
			stats.FirstTimestamp,
			stats.LastTimestamp));
	}
}

