using AnalyzeService.Contracts;
using AnalyzeService.Services;

namespace AnalyzeService.Interfaces;

public interface IAnalyticsStatsService {
	Task<AnalyticsStatsDto> GetStatsAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
}
