using Common.Interfaces.Parser;
using Microsoft.AspNetCore.WebUtilities;

namespace AnalyzeService.Services;

public sealed record HistoryPointDto(string Timestamp, double Value);

public sealed record HistoryQueryRequest(
	string Slug,
	string Metric,
	string? Range,
	string? Interval,
	DateTime? From,
	DateTime? To,
	Guid UserId,
	IReadOnlyDictionary<string, string>? Dimensions = null);

public sealed class HistoryQueryService(IHttpRestClient httpClient, AnalyticsCache cache) : IHistoryQueryService {
	public async Task<HistoryPointDto[]> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(request.Metric))
			throw new Common.Exceptions.BadRequestException("Metric is required.");

		DateTime effectiveFrom;
		DateTime effectiveTo;
		string effectiveInterval;

		if (!string.IsNullOrWhiteSpace(request.Range)) {
			if (!AnalyticsTimeRangeResolver.TryResolvePreset(request.Range, out effectiveFrom, out effectiveTo, out effectiveInterval))
				throw new Common.Exceptions.BadRequestException("Range must be one of: day, week, month, quarter, year, all, all-time.");

			if (!string.IsNullOrWhiteSpace(request.Interval))
				effectiveInterval = request.Interval.Trim().ToLowerInvariant();
		}
		else {
			if (request.From is null || request.To is null)
				throw new Common.Exceptions.BadRequestException("from and to are required when range is not specified.");

			effectiveFrom = request.From.Value;
			effectiveTo = request.To.Value;
			effectiveInterval = string.IsNullOrWhiteSpace(request.Interval)
				? AnalyticsTimeRangeResolver.InferInterval(effectiveFrom, effectiveTo)
				: request.Interval.Trim().ToLowerInvariant();
		}

		if (!AnalyticsTimeRangeResolver.IsSupportedInterval(effectiveInterval))
			throw new Common.Exceptions.BadRequestException("Interval must be one of: hour, day, week, month.");

		if (effectiveFrom > effectiveTo)
			throw new Common.Exceptions.BadRequestException("'from' must be less than or equal to 'to'.");

		var query = new Dictionary<string, string?> {
			["metric"] = request.Metric,
			["interval"] = effectiveInterval,
			["from"] = effectiveFrom.ToString("O"),
			["to"] = effectiveTo.ToString("O"),
			["userId"] = request.UserId.ToString()
		};

		if (request.Dimensions is not null)
			foreach (var dimension in request.Dimensions)
				query[dimension.Key] = dimension.Value;

		var cacheKey = AnalyticsCache.BuildKey("history", request.Slug, query);
		var data = await cache.GetOrCreateAsync(cacheKey, TimeSpan.FromMinutes(2), async () => {
			var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/history/{request.Slug}", query);
			return await httpClient.GetAsync<HistoryPointDto[]>(uri) ?? Array.Empty<HistoryPointDto>();
		}, cancellationToken);

		return data ?? Array.Empty<HistoryPointDto>();
	}
}

