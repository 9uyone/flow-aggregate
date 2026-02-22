using CollectorService.Interfaces;
using Common.Contracts;
using Common.Contracts.Events;
using Common.Contracts.Parser;
using Common.Extensions;
using Microsoft.AspNetCore.Mvc;
using Nelibur.ObjectMapper;

namespace CollectorService;

public static class CollectorEndpoints {
	public static void MapCollectorEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/collector")
			.WithTags("Collector Service");

		group.MapPost("/ingest", async (
			ParserDataPayload dto,
			IIntegrationDispatcher dispatcher,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId();

			var ev = TinyMapper.Map<DataCollectedEvent>(dto);
			ev.CorrelationId = Guid.GenCorrelationId();

			await dispatcher.DispatchAsync(ev);
			return Results.Accepted();
		})
		.RequireAuthorization();

		group.MapPost("/run/{name}", async (
			string name,
			[FromBody] IDictionary<string, string>? options,
			IParserRegistry registry,
			IIntegrationDispatcher dispatcher,
			HttpContext httpContext) =>
		{
			var userId = httpContext.User.GetUserId();

			var command = new RunParserCommand {
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
	}
}
