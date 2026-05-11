using AnalyzeService.Contracts;
using AnalyzeService.Services;

namespace AnalyzeService.Interfaces;

public interface IAdvancedAnalyticsService {
	Task<TrendResultDto> GetTrendAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
	Task<VolatilityResultDto> GetVolatilityAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
	Task<ForecastResultDto> GetForecastAsync(HistoryQueryRequest request, int horizon, CancellationToken cancellationToken = default);
	Task<string> GetAIAnalyticsSummary(AiAnalyticsSummaryInput input, CancellationToken cancellationToken = default);
}
