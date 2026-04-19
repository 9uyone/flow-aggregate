namespace AnalyzeService.Services;

public sealed record TrendResultDto(double Slope, double Intercept, double R2, string Direction, int PointsCount);
public sealed record VolatilityResultDto(double Mean, double StdDev, double CoefficientOfVariation, double Min, double Max, int PointsCount);
public sealed record ForecastPointDto(string Timestamp, double Value);
public sealed record ForecastResultDto(int Horizon, string Interval, ForecastPointDto[] Points, string Note);

public sealed record AdvancedAnalyticsResult<T>(bool Success, string? ErrorMessage, T? Data);

public interface IAdvancedAnalyticsService {
	Task<AdvancedAnalyticsResult<TrendResultDto>> GetTrendAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
	Task<AdvancedAnalyticsResult<VolatilityResultDto>> GetVolatilityAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
	Task<AdvancedAnalyticsResult<ForecastResultDto>> GetForecastAsync(HistoryQueryRequest request, int horizon, CancellationToken cancellationToken = default);
}

public sealed class AdvancedAnalyticsService(IHistoryQueryService historyQueryService) : IAdvancedAnalyticsService {
	public async Task<AdvancedAnalyticsResult<TrendResultDto>> GetTrendAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		var pointsResult = await GetSortedPointsAsync(request, cancellationToken);
		if (!pointsResult.Success)
			return new AdvancedAnalyticsResult<TrendResultDto>(false, pointsResult.ErrorMessage, null);

		var points = pointsResult.Data;
		if (points is null || points.Length == 0)
			return new AdvancedAnalyticsResult<TrendResultDto>(true, null, new TrendResultDto(0, 0, 0, "flat", 0));

		if (points.Length == 1)
			return new AdvancedAnalyticsResult<TrendResultDto>(true, null, new TrendResultDto(0, points[0].Value, 1, "flat", 1));

		var xs = Enumerable.Range(0, points.Length).Select(i => (double)i).ToArray();
		var ys = points.Select(p => p.Value).ToArray();

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

		var direction = slope > 0.0001 ? "up" : slope < -0.0001 ? "down" : "flat";
		return new AdvancedAnalyticsResult<TrendResultDto>(true, null, new TrendResultDto(slope, intercept, Math.Clamp(r2, 0, 1), direction, points.Length));
	}

	public async Task<AdvancedAnalyticsResult<VolatilityResultDto>> GetVolatilityAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) {
		var pointsResult = await GetSortedPointsAsync(request, cancellationToken);
		if (!pointsResult.Success)
			return new AdvancedAnalyticsResult<VolatilityResultDto>(false, pointsResult.ErrorMessage, null);

		var points = pointsResult.Data;
		if (points is null || points.Length == 0)
			return new AdvancedAnalyticsResult<VolatilityResultDto>(true, null, new VolatilityResultDto(0, 0, 0, 0, 0, 0));

		var values = points.Select(p => p.Value).ToArray();
		var mean = values.Average();
		var variance = values.Length == 1 ? 0 : values.Sum(v => Math.Pow(v - mean, 2)) / values.Length;
		var stdDev = Math.Sqrt(variance);
		var cv = mean == 0 ? 0 : (stdDev / Math.Abs(mean)) * 100;

		return new AdvancedAnalyticsResult<VolatilityResultDto>(true, null, new VolatilityResultDto(
			mean,
			stdDev,
			cv,
			values.Min(),
			values.Max(),
			values.Length));
	}

	public async Task<AdvancedAnalyticsResult<ForecastResultDto>> GetForecastAsync(HistoryQueryRequest request, int horizon, CancellationToken cancellationToken = default) {
		if (horizon <= 0 || horizon > 240)
			return new AdvancedAnalyticsResult<ForecastResultDto>(false, "horizon must be between 1 and 240", null);

		var pointsResult = await GetSortedPointsAsync(request, cancellationToken);
		if (!pointsResult.Success)
			return new AdvancedAnalyticsResult<ForecastResultDto>(false, pointsResult.ErrorMessage, null);

		var points = pointsResult.Data;
		if (points is null || points.Length < 2)
			return new AdvancedAnalyticsResult<ForecastResultDto>(false, "At least 2 points are required for forecast", null);

		var trendResult = await GetTrendAsync(request, cancellationToken);
		if (!trendResult.Success || trendResult.Data is null)
			return new AdvancedAnalyticsResult<ForecastResultDto>(false, trendResult.ErrorMessage ?? "Unable to calculate trend", null);

		var interval = ResolveInterval(request, points.Length);
		var step = ResolveStep(interval);
		var startX = points.Length;
		var lastTimestamp = DateTime.Parse(points.Last().Timestamp, null, System.Globalization.DateTimeStyles.AdjustToUniversal);
		var forecastPoints = new List<ForecastPointDto>(horizon);

		for (var i = 0; i < horizon; i++) {
			var x = startX + i;
			var value = trendResult.Data.Slope * x + trendResult.Data.Intercept;
			var timestamp = lastTimestamp.AddTicks(step.Ticks * (i + 1));
			forecastPoints.Add(new ForecastPointDto(timestamp.ToString("O"), value));
		}

		return new AdvancedAnalyticsResult<ForecastResultDto>(true, null, new ForecastResultDto(
			horizon,
			interval,
			forecastPoints.ToArray(),
			"Linear forecast based on simple trend"));
	}

	private async Task<AdvancedAnalyticsResult<HistoryPointDto[]>> GetSortedPointsAsync(HistoryQueryRequest request, CancellationToken cancellationToken) {
		var history = await historyQueryService.GetHistoryAsync(request, cancellationToken);
		if (!history.Success)
			return new AdvancedAnalyticsResult<HistoryPointDto[]>(false, history.ErrorMessage, null);

		var points = (history.Data ?? Array.Empty<HistoryPointDto>())
			.OrderBy(p => p.Timestamp, StringComparer.Ordinal)
			.ToArray();
		return new AdvancedAnalyticsResult<HistoryPointDto[]>(true, null, points);
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
