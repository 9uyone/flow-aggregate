namespace AnalyzeService.Contracts;

public sealed record VolatilityResultDto(double Mean, double StdDev, double CoefficientOfVariation, double Min, double Max, int PointsCount);
