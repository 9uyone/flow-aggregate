using CollectorService.Interfaces;
using Common.Contracts;
using Common.Contracts.Parser;
using Common.Entities;
using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using StorageService.Contracts;
using StorageService.Validation;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapParserConfigEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/storage/parser-cfg");

		// Create
		group.MapPost("/", async (
			ParserUserConfigDto dto,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext,
			IConfiguration config) => 
		{
			var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
			if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: interval, out var error))
				return Results.BadRequest(error);

			var created = await repo.CreateAsync(new ParserUserConfig {
				UserId = httpContext.User.GetUserId()!,
				ParserName = dto.ParserName,
				CronExpression = dto.CronExpression,
				IsEnabled = dto.IsEnabled,
				Options = dto.Options,
			});

			return Results.Created($"/storage/parser-cfg/{created.Id}", created);
		}).RequireAuthorization();

		// Get all for user
		group.MapGet("/", async (
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext,
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst) => {
				var userId = httpContext.User.GetUserId()!;
				var configs = await repo.FindAsync(c => c.UserId == userId, page, pageSize, oldFirst);

				return Results.Ok(configs);
			}).RequireAuthorization();

		// Get by id
		group.MapGet("/{id}", async (
			Guid id,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;

				var config = await repo.GetByIdAsync(id);
				if (config == null || config.UserId != userId)
					return Results.NotFound();

				return Results.Ok(config);
			}).RequireAuthorization();

		// Update
		group.MapPatch("/{id}", async (
			Guid id,
			ParserUserConfigPatchDto dto,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext,
			IConfiguration config) => 
		{
			var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
			if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: 60, out var error))
				return Results.BadRequest(error);

			var userId = httpContext.User.GetUserId()!;

			var existing = await repo.GetByIdAsync(id);
			if (existing == null || existing.UserId != userId)
				return Results.NotFound();

			var updates = new List<UpdateDefinition<ParserUserConfig>>();
			if (dto.CronExpression != null)
				updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.CronExpression, dto.CronExpression));
			if (dto.IsEnabled.HasValue)
				updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.IsEnabled, dto.IsEnabled.Value));
			if (dto.Options is not null)
				updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.Options, dto.Options));

			if (updates.Count == 0)
				return Results.BadRequest("No fields to update");

			var combinedUpdate = Builders<ParserUserConfig>.Update.Combine(updates);
			await repo.UpdateOneAsync(c => c.Id == id, combinedUpdate);

			return Results.NoContent();
		}).RequireAuthorization();

		// Delete
		group.MapDelete("/{id}", async (
			Guid id,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var existing = await repo.GetByIdAsync(id);
				if (existing == null || existing.UserId != userId)
					return Results.NotFound();

				await repo.DeleteAsync(c => c.Id == id);
				return Results.NoContent();
			}).RequireAuthorization();

		group.MapPost("/{id}/run", async (
			Guid id,
			IMongoRepository<ParserUserConfig> repo,
			IIntegrationDispatcher dispatcher) => {
				var config = await repo.GetByIdAsync(id);
				if (config == null) return Results.NotFound();

				var command = new RunParserCommand {
					ConfigId = config.Id,
					ParserName = config.ParserName,
					UserId = config.UserId,
					Options = config.Options,
					CorrelationId = Guid.GenCorrelationId(),
				};

				await dispatcher.DispatchAsync(command);
				return Results.Accepted(value: new RunParserResult { 
					CorrelationId = command.CorrelationId.Value
				});
			}).RequireAuthorization();
	}
}