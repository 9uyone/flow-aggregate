namespace AnalyzeService.Contracts;

public sealed record ForecastResultDto(int Horizon, string Interval, ForecastPointDto[] Points, string Note);
