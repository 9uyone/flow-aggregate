using CollectorService.Interfaces;
using Common.Attributes;
using Common.Contracts;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Models;
using Microsoft.AspNetCore.Mvc;
using Nelibur.ObjectMapper;
using System.Reflection;

namespace CollectorService;

public static class CollectorEndpoints {
	public static void MapCollectorEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/collector")
			.WithTags("Collector Service");

		group.MapPost("/ingest", async (InboundDataDto dto, IIntegrationDispatcher dispatcher) => {
			var @event = TinyMapper.Map<DataCollectedEvent>(dto);

			await dispatcher.DispatchAsync(@event);
			return Results.Accepted();
		});

		group.MapPost("/run/{name}", async (
			string name,
			[FromBody] IDictionary<string, string>? options,
			IParserRegistry registry,
			IServiceProvider sp,
			HttpContext httpContext,
			IIntegrationDispatcher dispatcher) => {
				var userId = httpContext.User.GetUserId();
				if (userId == null)
					return Results.Unauthorized();

				var parserType = registry.GetParserType(name);
				if (parserType == null)
					return Results.NotFound($"Parser '{name}' not found");

				var parser = sp.GetRequiredService(parserType) as IDataParser;
				var info = parserType.GetCustomAttribute<ParserInfoAttribute>();
				var data = await parser.ParseAsync(options);

				var ev = TinyMapper.Map<DataCollectedEvent>(data);
				ev.UserId = userId;
				ev.ParserName = info.Name;
				ev.Type = info.DataType;

				await dispatcher.DispatchAsync(ev);
				return Results.Ok(data);
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
