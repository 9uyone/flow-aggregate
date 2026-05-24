using AnalyzeService.Contracts;
using AnalyzeService.Interfaces;
using AnalyzeService.Services;
using Common.Contracts.Parser;
using Common.Extensions;
using Common.Interfaces.Parser;
using Microsoft.AspNetCore.Mvc;

namespace AnalyzeService;

public static class Endpoints {
	private sealed record StorageOverviewDto(
		int TotalRecords,
		int RecordsLastDay,
		int InternalParsers,
		int PluginParsers,
		int ExternalParsers,
		double SuccessRateLast100,
		int RunsConsidered);
	private sealed record MetricOptionResponse(string Metric, string[] Dimensions);
	private sealed record ParserDetailsResponse(IEnumerable<string>? Dimensions);
	private static readonly HashSet<string> ReservedQueryKeys = ["metric", "range", "interval", "from", "to", "horizon", "dimension", "userId"];

	public static void MapEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/analyze")
			.WithTags("Analyze Service")
			.RequireAuthorization();

		group.MapGet("/parsers/{slug}/history", async (IHistoryQueryService historyQueryService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var result = await historyQueryService.GetHistoryAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions));
				return Results.Ok(result ?? Array.Empty<HistoryPointDto>());
			});

		group.MapGet("/parsers/{slug}/stats", async (IAnalyticsStatsService analyticsStatsService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var result = await analyticsStatsService.GetStatsAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions));
				return Results.Ok(result);
			});

		group.MapGet("/parsers/{slug}/trend", async (IAdvancedAnalyticsService analyticsService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var result = await analyticsService.GetTrendAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions));
				return Results.Ok(result);
			});

		group.MapGet("/parsers/{slug}/volatility", async (IAdvancedAnalyticsService analyticsService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string? range,
			[FromQuery] string? interval,
			[FromQuery] DateTime? from,
			[FromQuery] DateTime? to) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var result = await analyticsService.GetVolatilityAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions));
				return Results.Ok(result);
			});

		group.MapGet("/parsers/{slug}/forecast", async (IAdvancedAnalyticsService analyticsService, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] int horizon = 12,
			[FromQuery] string? range = null,
			[FromQuery] string? interval = null,
			[FromQuery] DateTime? from = null,
			[FromQuery] DateTime? to = null) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var result = await analyticsService.GetForecastAsync(new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions), horizon);
				return Results.Ok(result);
			});

		group.MapGet("/parsers/{slug}/ai-summary", async (IAdvancedAnalyticsService analyticsService, IAnalyticsStatsService analyticsStatsService, AnalyticsCache analyticsCache, IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] int horizon = 12,
			[FromQuery] string? range = null,
			[FromQuery] string? interval = null,
			[FromQuery] DateTime? from = null,
			[FromQuery] DateTime? to = null) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var request = new HistoryQueryRequest(slug, metric, range, interval, from, to, userId, dimensions);
				var cacheParameters = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase) {
					["metric"] = metric,
					["range"] = range,
					["interval"] = interval,
					["from"] = from?.ToString("O"),
					["to"] = to?.ToString("O"),
					["horizon"] = horizon.ToString(),
					["userId"] = userId.ToString()
				};
				foreach (var item in dimensions.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase)) {
					cacheParameters[item.Key] = item.Value;
				}
				var cacheKey = AnalyticsCache.BuildKey("ai-summary", slug, cacheParameters);

				var cacheResult = await analyticsCache.GetOrCreateWithStateAsync<string>(cacheKey, TimeSpan.FromMinutes(5), async () => {
					var statsResult = await analyticsStatsService.GetStatsAsync(request);
					var trendResult = await analyticsService.GetTrendAsync(request);
					var volatilityResult = await analyticsService.GetVolatilityAsync(request);
					ForecastResultDto? forecastData = null;
					try {
						forecastData = await analyticsService.GetForecastAsync(request, horizon);
					}
					catch (Common.Exceptions.BadRequestException) {
						forecastData = null;
					}

					var parserDetails = await httpClient.GetAsync<ParserDetailsDto>($"/api/collector/parsers/{slug}");
					var parserContext = new AiParserContext(
						metric,
						slug,
						parserDetails?.DisplayName,
						parserDetails?.Description);
					var cacheStats = analyticsCache.GetAiSummaryCacheStats();

				return await analyticsService.GetAIAnalyticsSummary(new AiAnalyticsSummaryInput(
						statsResult,
						trendResult,
						volatilityResult,
						forecastData,
						parserContext,
					new AnalyzeService.Contracts.AiCacheContext(cacheStats.Hits, cacheStats.Misses, cacheStats.HitRate)));
				}, context.RequestAborted);

				analyticsCache.TrackAiSummaryCacheUsage(cacheResult.FromCache);
				var summary = cacheResult.Value;
				if (string.IsNullOrWhiteSpace(summary)) {
					throw new Common.Exceptions.ExternalServiceException("AI summary unavailable");
				}

				return Results.Ok(summary);
			});

		group.MapGet("/parsers/{slug}/available-metrics", async (IHttpRestClient httpClient, HttpContext context, string slug) => {
			var userId = context.User.GetUserId();
			var metricsUri = Microsoft.AspNetCore.WebUtilities.QueryHelpers.AddQueryString($"/internal/storage/aggregation/metrics/{slug}", new Dictionary<string, string?> {
				["userId"] = userId.ToString()
			});
			var recordMetrics = await httpClient.GetAsync<string[]>(metricsUri) ?? [];
			var parserDetails = await httpClient.GetAsync<ParserDetailsResponse>($"/api/collector/parsers/{slug}");
			var dimensions = parserDetails?.Dimensions?.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToArray() ?? [];

			var result = recordMetrics
				.Where(x => !string.IsNullOrWhiteSpace(x))
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.Select(metric => new MetricOptionResponse(metric, dimensions))
				.ToArray();

			return Results.Ok(result);
		});

		group.MapGet("/parsers/{slug}/dimension-options", async (IHttpRestClient httpClient, HttpContext context, string slug,
			[FromQuery] string metric,
			[FromQuery] string dimension) => {
				var userId = context.User.GetUserId();
				var dimensions = await BuildDimensionsAsync(httpClient, context.Request.Query, slug);
				var query = new Dictionary<string, string?> {
					["metric"] = metric,
					["dimension"] = dimension,
					["userId"] = userId.ToString()
				};

				foreach (var item in dimensions) {
					query[item.Key] = item.Value;
				}

				var uri = Microsoft.AspNetCore.WebUtilities.QueryHelpers.AddQueryString($"/internal/storage/aggregation/dimension-options/{slug}", query);
				var result = await httpClient.GetAsync<string[]>(uri);
				return Results.Ok(result ?? []);
			});

		group.MapGet("/overview", async (IHttpRestClient httpClient, AnalyticsCache analyticsCache, HttpContext context) =>
		{
			var userId = context.User.GetUserId();
			var overview = await httpClient.GetAsync<StorageOverviewDto>($"/internal/storage/overview?userId={userId}");
			if (overview is null)
				throw new Common.Exceptions.ExternalServiceException("Overview data unavailable");

			var cacheStats = analyticsCache.GetAiSummaryCacheStats();
			return Results.Ok(new AnalyzeOverviewDto(
				overview.TotalRecords,
				overview.RecordsLastDay,
				overview.InternalParsers,
				overview.PluginParsers,
				overview.ExternalParsers,
				overview.SuccessRateLast100,
				overview.RunsConsidered,
				new AiCacheContext(cacheStats.Hits, cacheStats.Misses, cacheStats.HitRate)));
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




