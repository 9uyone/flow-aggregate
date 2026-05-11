using StorageService.Services;

namespace StorageService.Interfaces;

public interface IHistoryAggregationService {
	Task<HistoryPointDto[]> GetHistoryAsync(Guid? userId, string slug, string metric, string interval, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
	Task<string[]> GetDimensionOptionsAsync(Guid? userId, string slug, string metric, string dimensionKey, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
}
