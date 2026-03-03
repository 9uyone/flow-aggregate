using CollectorService.Interfaces;
using Common.Contracts.Events;
using Common.Contracts.Parser;
using Common.Contracts.ParserConfig;
using Common.Extensions;
using Common.Interfaces.Parser;
using Microsoft.AspNetCore.Mvc;

namespace CollectorService;

public static class CollectorEndpoints {
	public static void MapCollectorEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/collector")
			.WithTags("Collector Service");

		group.MapPost("/ingest", async (
			ParserDataPayload dto,
			IIntegrationDispatcher dispatcher,
			IHttpRestClient httpClient,
			HttpContext httpContext) => {
				var token = httpContext.Request.Headers["X-Parser-Token"].ToString();
				if (string.IsNullOrEmpty(token))
					return Results.Unauthorized();

				var tokenHash = SecurityHelper.HashToken(token);
				var config = await httpClient.GetAsync<ParserConfigDto>(
					$"/internal/storage/parser-cfg/by-token-hash/{tokenHash}");
				if (config == null || !config.IsEnabled)
					return Results.Forbid();

				var correlationId = Guid.GenCorrelationId();

				var dataEvent = new DataCollectedEvent {
					ParserName = config.ParserName,
					UserId = config.UserId,
					Source = dto.Source,
					Metric = dto.Metric,
					Value = dto.Value,
					RawContent = dto.RawContent,
					Category = dto.Category, // Determine from parser or config
					Metadata = dto.Metadata,
					CorrelationId = correlationId,
					ConfigId = config.Id
				};

				var statusEvent = new ParserStatusUpdatedEvent {
					ConfigId = config.Id,
					CorrelationId = correlationId,
					UserId = config.UserId,
					ParserName = config.ParserName,
					IsSuccess = true,
					ErrorMessage = null,
					FinishedAtUtc = DateTime.UtcNow,
					Options = config.External?.TokenHash != null ? new Dictionary<string, string>() : null
				};

				await dispatcher.DispatchAsync(dataEvent);
				await dispatcher.DispatchAsync(statusEvent);

				return Results.Accepted();
			});

		group.MapPost("/run/{name}", async (
			string name,
			[FromBody] IDictionary<string, string>? options,
			IParserRegistry registry,
			IIntegrationDispatcher dispatcher,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId();

			var command = new RunParserEvent {
				ParserName = name,
				UserId = userId!,
				Options = options,
				CorrelationId = Guid.GenCorrelationId(),
			};

			await dispatcher.DispatchAsync(command);
			return Results.Ok(new RunParserResult { 
				CorrelationId = command.CorrelationId.Value
			});
		}).RequireAuthorization();

		group.MapGet("/parsers", (IParserRegistry registry) => 
			Results.Ok(registry.GetAvailableParsers())
		);

		group.MapGet("/parser/{name}", async (string name, IParserRegistry registry) => {
			var details = await registry.GetParserDetailsAsync(name);
			return details != null ? Results.Ok(details) : Results.NotFound();
		});

		group.MapGet("/parser/{name}/exists_internal", async (string name, IParserRegistry registry) =>
			Results.Ok( registry.GetParserType(name) != null )
		);
	}
}