using AnalyzeService.Services;
using Common.Interfaces.Parser;
using Microsoft.AspNetCore.Mvc;

namespace AnalyzeService;

public static class Endpoints {
	private sealed record MetricOptionResponse(string Metric, string[] Dimensions);
	private sealed record ParserDetailsResponse(IEnumerable<string>? Dimensions);
	private static readonly HashSet<string> ReservedQueryKeys = ["metric", "range", "interval", "from", "to"];

	public static void MapEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/analyze")
			.WithTags("Analyze Service");

		group.MapGet("/parsers/{slug}/history", async (IHistoryQueryService historyQueryService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) =>
		{
			var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
			var result = await historyQueryService.GetHistoryAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, dimensions));
			return result.Success ? Results.Ok(result.Data ?? Array.Empty<HistoryPointDto>()) : Results.BadRequest(result.ErrorMessage);
		});

		group.MapGet("/parsers/{slug}/stats", async (IAnalyticsStatsService analyticsStatsService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) =>
		{
			var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
			var result = await analyticsStatsService.GetStatsAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, dimensions));
			return result.Success ? Results.Ok(result.Data) : Results.BadRequest(result.ErrorMessage);
		});

		group.MapGet("/parsers/{slug}/available-metrics", async (IHttpRestClient httpClient, string slug) => {
			var recordMetrics = await httpClient.GetAsync<string[]>($"/internal/storage/aggregation/metrics/{slug}") ?? [];
			var parserDetails = await httpClient.GetAsync<ParserDetailsResponse>($"/api/collector/parsers/{slug}");
			var dimensions = parserDetails?.Dimensions?.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToArray() ?? [];

			var result = recordMetrics
				.Where(x => !string.IsNullOrWhiteSpace(x))
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.OrderBy(x => x)
				.Select(metric => new MetricOptionResponse(metric, dimensions))
				.ToArray();

			return Results.Ok(result);
		});

		group.MapGet("/parsers/{slug}/dimension-options", async (IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string dimension) =>
		{
			var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
			var query = new Dictionary<string, string?> {
				["metric"] = metric,
				["dimension"] = dimension
			};

			foreach (var item in dimensions) {
				query[item.Key] = item.Value;
			}

			var uri = Microsoft.AspNetCore.WebUtilities.QueryHelpers.AddQueryString($"/internal/storage/aggregation/dimension-options/{slug}", query);
			var result = await httpClient.GetAsync<string[]>(uri);
			return Results.Ok(result ?? []);
		});
	}

	private static async Task<IReadOnlyDictionary<string, string>> BuildDimensionsAsync(IHttpRestClient httpClient, IQueryCollection query, string slug) {
		var parserDetails = await httpClient.GetAsync<ParserDetailsResponse>($"/api/collector/parsers/{slug}");
		var allowed = parserDetails?.Dimensions?.Where(x => !string.IsNullOrWhiteSpace(x)).ToHashSet(StringComparer.OrdinalIgnoreCase) ?? [];
		if (allowed.Count == 0) {
			return new Dictionary<string, string>();
		}

		var dimensions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
		foreach (var (key, value) in query) {
			if (ReservedQueryKeys.Contains(key) || !allowed.Contains(key)) {
				continue;
			}

			var resolvedValue = value.ToString();
			if (!string.IsNullOrWhiteSpace(resolvedValue)) {
				dimensions[key] = resolvedValue;
			}
		}

		return dimensions;
	}
}
