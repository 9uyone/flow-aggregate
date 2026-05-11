namespace AnalyzeService.Contracts;

public sealed record StorageStatsDto(
	double Count,
	double Min,
	double Max,
	double Average,
	double FirstValue,
	double LastValue,
	string? FirstTimestamp,
	string? LastTimestamp);
