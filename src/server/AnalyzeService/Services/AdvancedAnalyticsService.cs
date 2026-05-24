using AnalyzeService.Contracts;
using AnalyzeService.Interfaces;

namespace AnalyzeService.Services;

public sealed class AdvancedAnalyticsService(IHistoryQueryService historyQueryService, IAiModelClient aiModelClient) : IAdvancedAnalyticsService {
	public async Task<TrendResultDto> GetTrendAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		var points = await GetSortedPointsAsync(request, cancellationToken);
		if (points is null || points.Length == 0)
			return new TrendResultDto(0, 0, 0, "flat", 0, "Stable", 0);

		if (points.Length == 1)
			return new TrendResultDto(0, points[0].Value, 1, "flat", 0, "Stable", 1);

		static (double Slope, double Intercept, double R2) CalculateTrend(double[] ys) {
			if (ys.Length == 0)
				return (0, 0, 0);

			if (ys.Length == 1)
				return (0, ys[0], 1);

			var xs = Enumerable.Range(0, ys.Length).Select(i => (double)i).ToArray();
			var xMean = xs.Average();
			var yMean = ys.Average();
			var numerator = 0d;
			var denominator = 0d;

			for (var i = 0; i < xs.Length; i++) {
				var dx = xs[i] - xMean;
				numerator += dx * (ys[i] - yMean);
				denominator += dx * dx;
			}

			var slope = denominator == 0 ? 0 : numerator / denominator;
			var intercept = yMean - slope * xMean;

			var ssTot = ys.Sum(y => Math.Pow(y - yMean, 2));
			var ssRes = ys.Select((y, i) => y - (slope * xs[i] + intercept)).Sum(residual => residual * residual);
			var r2 = ssTot == 0 ? 1 : 1 - (ssRes / ssTot);
			if (double.IsNaN(r2) || double.IsInfinity(r2))
				r2 = 0;

			return (slope, intercept, Math.Clamp(r2, 0, 1));
		}

		var ys = points.Select(p => p.Value).ToArray();
		var (slope, intercept, r2) = CalculateTrend(ys);
		var direction = slope > 0.0001 ? "up" : slope < -0.0001 ? "down" : "flat";

		var splitIndex = points.Length / 2;
		var pastYs = ys.Take(splitIndex).ToArray();
		var recentYs = ys.Skip(splitIndex).ToArray();
		var (pastSlope, _, _) = CalculateTrend(pastYs);
		var (recentSlope, _, _) = CalculateTrend(recentYs);
		var momentum = recentSlope - pastSlope;
		var momentumDirection = momentum > 0.0001 ? "Accelerating" : momentum < -0.0001 ? "Decelerating" : "Stable";

		return new TrendResultDto(slope, intercept, r2, direction, momentum, momentumDirection, points.Length);
	}

	public async Task<VolatilityResultDto> GetVolatilityAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		var points = await GetSortedPointsAsync(request, cancellationToken);
		if (points is null || points.Length == 0)
			return new VolatilityResultDto(0, 0, 0, 0, 0, 0);

		var values = points.Select(p => p.Value).ToArray();
		var mean = values.Average();
		var variance = values.Length == 1 ? 0 : values.Sum(v => Math.Pow(v - mean, 2)) / values.Length;
		var stdDev = Math.Sqrt(variance);
		var cv = mean == 0 ? 0 : (stdDev / Math.Abs(mean)) * 100;

		return new VolatilityResultDto(
			mean,
			stdDev,
			cv,
			values.Min(),
			values.Max(),
			values.Length);
	}

	public async Task<ForecastResultDto> GetForecastAsync(HistoryQueryRequest request, int horizon, CancellationToken cancellationToken = default) {
		if (horizon <= 0 || horizon > 240)
			throw new Common.Exceptions.BadRequestException("horizon must be between 1 and 240");

		var points = await GetSortedPointsAsync(request, cancellationToken);
		if (points is null || points.Length < 2)
			throw new Common.Exceptions.BadRequestException("At least 2 points are required for forecast");

		var trendResult = await GetTrendAsync(request, cancellationToken);

		var interval = ResolveInterval(request, points.Length);
		var step = ResolveStep(interval);
		var startX = points.Length;
		var lastTimestamp = DateTime.Parse(points.Last().Timestamp, null, System.Globalization.DateTimeStyles.AdjustToUniversal);
		var forecastPoints = new List<ForecastPointDto>(horizon);

		for (var i = 0; i < horizon; i++) {
			var x = startX + i;
			var value = trendResult.Slope * x + trendResult.Intercept;
			var timestamp = lastTimestamp.AddTicks(step.Ticks * (i + 1));
			forecastPoints.Add(new ForecastPointDto(timestamp.ToString("O"), value));
		}

		return new ForecastResultDto(
			horizon,
			interval,
			forecastPoints.ToArray(),
			"Linear forecast based on simple trend");
	}

	public async Task<string> GetAIAnalyticsSummary(AiAnalyticsSummaryInput input, CancellationToken cancellationToken = default) {
		string formatDouble(double value) => value.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);

		var stats = input.MetricStatistics;
		var trend = input.TrendInfo;
		var volatility = input.VolatilityInfo;
		var forecast = input.Forecast;
		var parser = input.Parser;
		var cache = input.Cache;
		var baseline = stats.Average;
		var deltaFromAverage = stats.LastValue - baseline;
		var deviationFromAverage = baseline == 0 ? 0 : (deltaFromAverage / baseline) * 100;
		var isAnomaly = Math.Abs(stats.LastValue - baseline) > (2 * volatility.StdDev);

		var forecastSnippet = forecast?.Points?.Length > 0
			? string.Join(", ", forecast.Points.Take(3).Select(point => $"{point.Timestamp}:{formatDouble(point.Value)}"))
			: "none";

		var userMessage = $"""
FORMAT=TOON
parser.metric={parser.Metric}
parser.slug={parser.Slug}
parser.name={parser.DisplayName ?? "(unknown)"}
parser.description={parser.Description ?? "(none)"}
stats.mean={formatDouble(stats.Average)}
stats.min={formatDouble(stats.Min)}
stats.max={formatDouble(stats.Max)}
stats.median={formatDouble(stats.Median)}
stats.q1={formatDouble(stats.Q1)}
stats.q3={formatDouble(stats.Q3)}
stats.points={stats.Count.ToString("0", System.Globalization.CultureInfo.InvariantCulture)}
stats.last={formatDouble(stats.LastValue)}
stats.deltaFromAverage={formatDouble(deltaFromAverage)}
stats.deviationFromAverage={formatDouble(deviationFromAverage)}
stats.isAnomaly={isAnomaly.ToString().ToLowerInvariant()}
trend.slope={formatDouble(trend.Slope)}
trend.direction={trend.Direction}
trend.momentum={formatDouble(trend.Momentum)}
trend.momentumDirection={trend.MomentumDirection}
trend.quality={formatDouble(trend.R2)}
volatility.std={formatDouble(volatility.StdDev)}
volatility.cv={formatDouble(volatility.CoefficientOfVariation)}
volatility.mean={formatDouble(volatility.Mean)}
forecast.sample={forecastSnippet}
forecast.note={forecast?.Note ?? "(none)"}

TASK: Reply in English with 3-5 concise sentences. FOCUS on interpreting the MEANING of the data, not just repeating the numbers. Instead of saying 'the slope is X', say 'the trend shows steady growth/decline'. Describe the data domain correctly based on the description (e.g., 'currency exchange rates' or 'weather conditions'). Interpret volatility using descriptive terms (e.g., 'the data is highly stable' or 'unpredictable moderate fluctuations'). Compare the last value with the average and state if it's currently unusually high/low or within the normal range. End with a one-sentence future outlook. Tone: friendly, professional, insightful (like a smart colleague). No headings, no bullets, and NO REPEATING the exact numeric values from input unless absolutely necessary for comparison.
""";

		var summary = await aiModelClient.GetCompletionAsync(
			"You are an expert data scientist for the Flow Aggregate platform.",
			userMessage,
			cancellationToken);

		if (string.IsNullOrWhiteSpace(summary))
			throw new Common.Exceptions.ExternalServiceException("AI summary unavailable");

		return summary;
	}

	private async Task<HistoryPointDto[]> GetSortedPointsAsync(HistoryQueryRequest request, CancellationToken cancellationToken) {
		var history = await historyQueryService.GetHistoryAsync(request, cancellationToken);
		var points = (history ?? Array.Empty<HistoryPointDto>())
			.OrderBy(p => p.Timestamp, StringComparer.Ordinal)
			.ToArray();
		return points;
	}

	private static string ResolveInterval(HistoryQueryRequest request, int pointsCount) {
		if (!string.IsNullOrWhiteSpace(request.Interval))
			return request.Interval.Trim().ToLowerInvariant();

		if (!string.IsNullOrWhiteSpace(request.Range) && AnalyticsTimeRangeResolver.TryResolvePreset(request.Range, out _, out _, out var presetInterval))
			return presetInterval;

		return pointsCount > 180 ? "month" : pointsCount > 48 ? "day" : "hour";
	}

	private static TimeSpan ResolveStep(string interval) {
		return interval switch {
			"hour" => TimeSpan.FromHours(1),
			"day" => TimeSpan.FromDays(1),
			"week" => TimeSpan.FromDays(7),
			"month" => TimeSpan.FromDays(30),
			_ => TimeSpan.FromDays(1)
		};
	}
}
