using Common.Interfaces.Parser;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace AnalyzeService;

public static class Endpoints {
	public static void MapEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/analyze")
			.WithTags("Analyze Service");

		group.MapGet("/history/{slug}", async (IHttpRestClient httpClient, string slug,
			[FromQuery] string metric,
			[FromQuery] DateTime from, [FromQuery] DateTime to) =>
		{
			var uri = QueryHelpers.AddQueryString($"/internal/storage/aggregation/history/{slug}", new Dictionary<string, string?> {
				["metric"] = metric,
				["from"] = from.ToString("O"),
				["to"] = to.ToString("O")
			});

			var resp = await httpClient.GetAsync<object>(uri);
			return Results.Ok(resp);
		});

		group.MapGet("/metrics/{slug}", async (IHttpRestClient httpClient, string slug) => {
			var resp = await httpClient.GetAsync<object>($"/internal/storage/aggregation/metrics/{slug}");

			return Results.Ok(resp);
		});
	}
}