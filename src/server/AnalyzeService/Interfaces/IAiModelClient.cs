namespace AnalyzeService.Interfaces;

public interface IAiModelClient {
	Task<string?> GetCompletionAsync(string systemMessage, string userMessage, CancellationToken cancellationToken = default);
}
