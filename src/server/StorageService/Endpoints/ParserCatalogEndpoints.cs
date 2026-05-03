using Common.Config;
using Common.Contracts.Parser;
using Common.Enums;
using Common.Extensions;
using Common.Interfaces.Parser;
using Microsoft.AspNetCore.Mvc;
using StorageService.Services;

using System.Text.Json.Serialization;

namespace StorageService.Endpoints;

internal sealed class ParametersWrapper {
	[JsonPropertyName("parameters")]
	public List<ParserParameterDetailsDto>? Parameters { get; set; }
}

public static partial class StorageEndpoints {
	public static void MapParserCatalogEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/parsers")
			.WithTags("Parser Catalog");

		group.MapGet("/", async (ParserCatalogService service, HttpContext httpContext) => {
			var userId = httpContext.User.GetUserId()!;
			var data = await service.GetAllAsync(userId);
			return Results.Ok(data);
		}).RequireAuthorization();

		group.MapGet("/{slug}", async (
			ParserCatalogService service,
			IHttpRestClient httpClient,
			HttpContext httpContext,
			string slug,
			[FromQuery(Name = "includeParameters")] bool includeParameters = false) => {
				var userId = httpContext.User.GetUserId()!;
				var definition = await service.GetDefinitionAsync(slug, userId);
				var parameters = Enumerable.Empty<ParserParameterDetailsDto>();

				if (includeParameters && definition.SourceType is ParserSourceType.Internal or ParserSourceType.Plugin) {
					var url = $"/api/collector/parsers/{slug}";
					try {
						var response = await httpClient.GetAsync<ParametersWrapper>(url);
						if (response?.Parameters != null && response.Parameters.Count > 0)
							parameters = response.Parameters;
					} catch {
						// якщо запит не вдався або десеріалізація не вдалась, залишаємо пусту колекцію
					}
				}

				return Results.Ok(new ParserDetailsDto(
					definition.Slug,
					definition.DisplayName,
					definition.Description,
					definition.SourceType,
					definition.MetricFields?.ToArray() ?? [],
					definition.Dimensions?.ToArray() ?? [],
					definition.SupportsScheduledRun,
					definition.SupportsManualRun,
					definition.SupportsPushIngest,
					definition.SupportsParameters,
					parameters));
		}).RequireAuthorization();

	}
}
