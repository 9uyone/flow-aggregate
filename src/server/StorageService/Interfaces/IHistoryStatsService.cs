using StorageService.Services;

namespace StorageService.Interfaces;

public interface IHistoryStatsService {
	Task<HistoryStatsDto> GetStatsAsync(Guid? userId, string slug, string metric, DateTime from, DateTime to, IReadOnlyDictionary<string, string>? dimensions = null, CancellationToken cancellationToken = default);
}
