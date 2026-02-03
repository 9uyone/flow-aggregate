using StorageService.Contracts;
using Common.Extensions;
using Common.Interfaces;
using Common.Models;
using StorageService.Validation;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapParserConfigEndpoints(this IEndpointRouteBuilder app) {
		var parserConfigGroup = app.MapGroup("/parser-cfg");

		// Create
		parserConfigGroup.MapPost("/", async (
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

			return Results.Created($"/parser-cfg/{created.Id}", created);
		}).RequireAuthorization();

		// Get all for user
		parserConfigGroup.MapGet("/", async (
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var configs = await repo.FindAsync(c => c.UserId == userId);

				return Results.Ok(configs);
			}).RequireAuthorization();

		// Get by id
		parserConfigGroup.MapGet("/{id}", async (
			string id,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;

				var config = await repo.GetByIdAsync(id);
				if (config == null || config.UserId != userId)
					return Results.NotFound();

				return Results.Ok(config);
			}).RequireAuthorization();

		// Update
		parserConfigGroup.MapPut("/{id}", async (
			string id,
			ParserUserConfigDto dto,
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

			var updatedConfig = new ParserUserConfig {
				Id = existing.Id,
				UserId = existing.UserId,
				ParserName = dto.ParserName,
				CronExpression = dto.CronExpression,
				IsEnabled = dto.IsEnabled,
				Options = dto.Options,
				LastRunUtc = existing.LastRunUtc,
			};
			await repo.ReplaceOneAsync(c => c.Id == id, updatedConfig);

			return Results.Ok(updatedConfig);
		}).RequireAuthorization();

		// Delete
		parserConfigGroup.MapDelete("/{id}", async (
			string id,
			IMongoRepository<ParserUserConfig> repo,
			HttpContext httpContext) => {
				var userId = httpContext.User.GetUserId()!;
				var existing = await repo.GetByIdAsync(id);
				if (existing == null || existing.UserId != userId)
					return Results.NotFound();

				await repo.DeleteAsync(c => c.Id == id);
				return Results.NoContent();
			}).RequireAuthorization();
	}
}