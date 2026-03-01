using Common.Interfaces.Parser;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;

namespace Common;

public class HttpRestClient : IHttpRestClient {
	private readonly HttpClient _httpClient;
	private readonly ILogger<HttpRestClient> _logger;

	public HttpRestClient(HttpClient httpClient, ILogger<HttpRestClient> logger) {
		_httpClient = httpClient;
		_logger = logger;

		if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true")
			httpClient.BaseAddress = new Uri("collector");
		else httpClient.BaseAddress = new Uri("https://localhost:5001");
	}

	public async Task<T?> GetAsync<T>(string url) {

		try {
			_logger.LogInformation("[HTTP GET] Sending request to {Url}", url);
			var response = await _httpClient.GetFromJsonAsync<T>(url);

			return response;
		}
		catch (Exception ex) {
			_logger.LogError(ex, "[HTTP GET] Failed for {Url}", url);
			return default; // поверне null для посилальних типів
		}
	}
}