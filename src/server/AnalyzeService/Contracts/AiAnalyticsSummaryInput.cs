namespace AnalyzeService.Contracts;

public sealed record AiAnalyticsSummaryInput(
	AnalyticsStatsDto MetricStatistics,
	TrendResultDto TrendInfo,
	VolatilityResultDto VolatilityInfo,
	ForecastResultDto? Forecast,
	AiParserContext Parser,
	AiCacheContext Cache);
