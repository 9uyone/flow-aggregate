namespace AnalyzeService.Services;

public interface IHistoryQueryService {
	Task<HistoryPointDto[]> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default);
}

