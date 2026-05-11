namespace AnalyzeService.Contracts;

public sealed record TrendResultDto(double Slope, double Intercept, double R2, string Direction, double Momentum, string MomentumDirection, int PointsCount);
