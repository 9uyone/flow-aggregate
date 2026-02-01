using CollectorService.Interfaces;
using CollectorService.Services;
using Common.Contracts;
using Common.Extensions;
using Common.Models;
using Microsoft.AspNetCore.Mvc;
using Nelibur.ObjectMapper;

namespace CollectorService;

public static class CollectorEndpoints {
	public static void MapCollectorEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/collector")
			.WithTags("Collector Service");

		group.MapPost("/ingest", async (
			InboundDataDto dto,
			[FromQuery] Guid? correlationId,
			IIntegrationDispatcher dispatcher,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId();
			if (userId == null)
				return Results.Unauthorized();

			var ev = TinyMapper.Map<DataCollectedEvent>(dto);
			ev.CorrelationId = correlationId.EnsureCorrelationId();

			await dispatcher.DispatchAsync(ev);
			return Results.Accepted();
		})
		.RequireAuthorization();

		group.MapPost("/run/{name}", async (
			string name,
			[FromQuery] Guid? correlationId,
			[FromBody] IDictionary<string, string>? options,
			IParserRegistry registry,
			IParserRunner parserRunner,
			HttpContext httpContext
			) =>
		{
			var userId = httpContext.User.GetUserId();
			if (userId == null)
				return Results.Unauthorized();

			var result = await parserRunner.ExecuteAsync(name, userId, options, correlationId);

			return Results.Ok(result);
		})
		.RequireAuthorization();

		group.MapGet("/parsers", (IParserRegistry registry) => 
			Results.Ok(registry.GetAvailableParsers())
		);

		group.MapGet("/parser/{name}", async (string name, IParserRegistry registry) => {
			var details = await registry.GetParserDetailsAsync(name);
			return details != null ? Results.Ok(details) : Results.NotFound();
		});
	}
}
