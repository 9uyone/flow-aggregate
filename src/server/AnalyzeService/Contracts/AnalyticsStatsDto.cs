namespace AnalyzeService.Contracts;

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
