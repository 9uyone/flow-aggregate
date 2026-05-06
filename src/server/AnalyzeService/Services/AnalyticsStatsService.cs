using Common.Interfaces.Parser;
using Microsoft.AspNetCore.WebUtilities;

namespace AnalyzeService.Services;

public sealed record AnalyticsStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double Median,
	double Q1,
	double Q3,
	double FirstValue,
	double LastValue,
	double Delta,
	double? PercentChange,
	string? FirstTimestamp,
	string? LastTimestamp);

public sealed record StorageStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double FirstValue,
	double LastValue,
	string? FirstTimestamp,
	string? LastTimestamp);

public interface IAnalyticsStatsService
{
	Task<AnalyticsStatsDto> GetStatsAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
}

public sealed class AnalyticsStatsService(IHttpRestClient httpClient, AnalyticsCache cache, IHistoryQueryService historyQueryService) : IAnalyticsStatsService
{
	public async Task<AnalyticsStatsDto> GetStatsAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default)
	{
		if (string.IsNullOrWhiteSpace(request.Metric))
			throw new Common.Exceptions.BadRequestException("Metric is required.");

		DateTime from;
		DateTime to;

		if (!string.IsNullOrWhiteSpace(request.Range))
		{
			if (!AnalyticsTimeRangeResolver.TryResolvePreset(request.Range, out from, out to, out _))
				throw new Common.Exceptions.BadRequestException("Range must be one of: day, week, month, quarter, year, all, all-time.");
		}
		else
		{
			if (request.From is null || request.To is null)
				throw new Common.Exceptions.BadRequestException("from and to are required when range is not specified.");

			from = request.From.Value;
			to = request.To.Value;
		}

		if (from > to)
			throw new Common.Exceptions.BadRequestException("'from' must be less than or equal to 'to'.");

		var query = new Dictionary<string, string?>
		{
			["metric"] = request.Metric,
			["from"] = from.ToString("O"),
			["to"] = to.ToString("O"),
			["userId"] = request.UserId.ToString()
		};

		if (request.Dimensions is not null)
			foreach (var dimension in request.Dimensions)
				query[dimension.Key] = dimension.Value;

		var cacheKey = AnalyticsCache.BuildKey("stats", request.Slug, query);
		var stats = await cache.GetOrCreateAsync(cacheKey, TimeSpan.FromMinutes(2), async () =>
		{
			var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/stats/{request.Slug}", query);
			return await httpClient.GetAsync<StorageStatsDto>(uri);
		}, cancellationToken);
		var history = await historyQueryService.GetHistoryAsync(request, cancellationToken);
		var values = history.Select(point => point.Value).OrderBy(value => value).ToArray();
		var median = ResolvePercentile(values, 0.5);
		var q1 = ResolvePercentile(values, 0.25);
		var q3 = ResolvePercentile(values, 0.75);

		if (stats is null)
			return new AnalyticsStatsDto(0, 0, 0, 0, median, q1, q3, 0, 0, 0, null, null, null);

		var baseline = stats.Average;
		var delta = stats.LastValue - baseline;
		double? percentChange = baseline == 0 ? null : (delta / baseline) * 100;

		return new AnalyticsStatsDto(
			stats.Count,
			stats.Min,
			stats.Max,
			stats.Average,
			median,
			q1,
			q3,
			stats.FirstValue,
			stats.LastValue,
			delta,
			percentChange,
			stats.FirstTimestamp,
			stats.LastTimestamp);
	}

	private static double ResolvePercentile(double[] sortedValues, double percentile)
	{
		if (sortedValues.Length == 0)
			return 0;

		if (sortedValues.Length == 1)
			return sortedValues[0];

		var position = (sortedValues.Length - 1) * percentile;
		var lowerIndex = (int)Math.Floor(position);
		var upperIndex = (int)Math.Ceiling(position);
		if (lowerIndex == upperIndex)
			return sortedValues[lowerIndex];

		var weight = position - lowerIndex;
		return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
	}
}

