using AnalyzeService.Config;
using AnalyzeService.Interfaces;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;

namespace AnalyzeService.Services;

public sealed class OpenAiModelClient(HttpClient httpClient, IOptions<OpenAiOptions> options, ILogger<OpenAiModelClient> logger) : IAiModelClient {
	private readonly OpenAiOptions options = options.Value;

	public async Task<string?> GetCompletionAsync(string systemMessage, string userMessage, CancellationToken cancellationToken = default) {
		if (string.IsNullOrWhiteSpace(userMessage))
			return null;

		if (httpClient.BaseAddress is null && !string.IsNullOrWhiteSpace(options.BaseUrl))
			httpClient.BaseAddress = new Uri(options.BaseUrl, UriKind.Absolute);

		if (httpClient.DefaultRequestHeaders.Authorization is null && !string.IsNullOrWhiteSpace(options.ApiKey))
			httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

		var request = new OpenAiChatRequest(
			options.Model,
			[
				new OpenAiChatMessage("system", systemMessage),
				new OpenAiChatMessage("user", userMessage)
			],
			options.Temperature);

		try {
			var response = await httpClient.PostAsJsonAsync("chat/completions", request, cancellationToken);
			if (!response.IsSuccessStatusCode) {
				logger.LogWarning("OpenAI request failed with status {StatusCode}", response.StatusCode);
				return null;
			}

			var payload = await response.Content.ReadFromJsonAsync<OpenAiChatResponse>(cancellationToken: cancellationToken);
			var content = payload?.Choices?.FirstOrDefault()?.Message?.Content;
			return string.IsNullOrWhiteSpace(content) ? null : content.Trim();
		}
		catch (Exception ex) {
			logger.LogError(ex, "OpenAI request failed");
			return null;
		}
	}

	private sealed record OpenAiChatMessage(string Role, string Content);
	private sealed record OpenAiChatRequest(string Model, OpenAiChatMessage[] Messages, double Temperature);
	private sealed record OpenAiChatResponse(OpenAiChatChoice[] Choices);
	private sealed record OpenAiChatChoice(OpenAiChatMessage Message);
}
