using Common.Interfaces.Parser;

namespace CollectorService.Services;

public class HttpRestClient(HttpClient httpClient, ILogger<HttpRestClient> logger) : IHttpRestClient {
	public async Task<T?> GetAsync<T>(string url) {
		try {
			logger.LogInformation("[HTTP GET] Sending request to {Url}", url);
			var response = await httpClient.GetFromJsonAsync<T>(url);

			return response;
		}
		catch (Exception ex) {
			logger.LogError(ex, "[HTTP GET] Failed for {Url}", url);
			return default; // поверне null для посилальних типів
		}
	}
}
