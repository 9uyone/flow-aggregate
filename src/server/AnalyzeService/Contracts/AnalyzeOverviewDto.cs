namespace AnalyzeService.Contracts;

public sealed record AnalyzeOverviewDto(
	int TotalRecords,
	int RecordsLastDay,
	int InternalParsers,
	int PluginParsers,
	int ExternalParsers,
	double SuccessRateLast100,
	int RunsConsidered,
	AiCacheContext AiSummaryCache);
