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

public sealed class HistoryQueryService(IHttpRestClient httpClient) : IHistoryQueryService {
	public async Task<HistoryQueryResult> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(request.Metric)) {
			return new HistoryQueryResult(false, "Metric is required.", null);
		}

		DateTime effectiveFrom;
		DateTime effectiveTo;
		string effectiveInterval;

		if (!string.IsNullOrWhiteSpace(request.Range)) {
			(effectiveFrom, effectiveTo, effectiveInterval) = ResolveRange(request.Range);
			if (effectiveInterval.Length == 0) {
				return new HistoryQueryResult(false, "Range must be one of: day, week, month, quarter, year, all, all-time.", null);
			}

			if (!string.IsNullOrWhiteSpace(request.Interval)) {
				effectiveInterval = request.Interval.Trim().ToLowerInvariant();
			}
		}
		else {
			if (request.From is null || request.To is null) {
				return new HistoryQueryResult(false, "from and to are required when range is not specified.", null);
			}

			effectiveFrom = request.From.Value;
			effectiveTo = request.To.Value;
			effectiveInterval = string.IsNullOrWhiteSpace(request.Interval)
				? InferInterval(effectiveFrom, effectiveTo)
				: request.Interval.Trim().ToLowerInvariant();
		}

		if (effectiveInterval is not ("hour" or "day" or "week" or "month")) {
			return new HistoryQueryResult(false, "Interval must be one of: hour, day, week, month.", null);
		}

		if (effectiveFrom > effectiveTo) {
			return new HistoryQueryResult(false, "'from' must be less than or equal to 'to'.", null);
		}

		var query = new Dictionary<string, string?> {
			["metric"] = request.Metric,
			["interval"] = effectiveInterval,
			["from"] = effectiveFrom.ToString("O"),
			["to"] = effectiveTo.ToString("O")
		};

		if (request.Dimensions is not null) {
			foreach (var dimension in request.Dimensions) {
				query[dimension.Key] = dimension.Value;
			}
		}

		var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/history/{request.Slug}", query);

		var data = await httpClient.GetAsync<HistoryPointDto[]>(uri);
		return new HistoryQueryResult(true, null, data ?? Array.Empty<HistoryPointDto>());
	}

	private static (DateTime From, DateTime To, string Interval) ResolveRange(string range) {
		var now = DateTime.UtcNow;

		return range.Trim().ToLowerInvariant() switch {
			"day" => (now.AddDays(-1), now, "hour"),
			"week" => (now.AddDays(-7), now, "day"),
			"month" => (now.AddMonths(-1), now, "week"),
			"quarter" or "3m" or "3-month" or "3 months" => (now.AddMonths(-3), now, "week"),
			"year" or "1y" => (now.AddYears(-1), now, "month"),
			"all" or "all-time" or "all time" => (DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc), now, "month"),
			_ => (default, default, string.Empty)
		};
	}

	private static string InferInterval(DateTime from, DateTime to) {
		var span = to - from;

		return span <= TimeSpan.FromDays(2)
			? "hour"
			: span <= TimeSpan.FromDays(90)
				? "day"
				: span <= TimeSpan.FromDays(365)
					? "week"
					: "month";
	}
}
