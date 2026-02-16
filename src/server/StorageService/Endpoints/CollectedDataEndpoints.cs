using Common.Contracts.Events;
using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Nelibur.ObjectMapper;
using Storage.Contracts;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	public static void MapCollectedDataEndpoints(this IEndpointRouteBuilder app) {
		TinyMapper.Bind<List<DataCollectedEvent>, List<DataResultDto>>();

		var group = app.MapGroup("/storage/collected")
			.WithTags("Collected data");

		group.MapGet("/", async (
			HttpContext httpContext,
			[FromQuery]Guid? correlationId,
			[FromQuery] Guid? configId,
			[FromQuery] int? page,
			[FromQuery] int? pageSize,
			[FromQuery] bool? oldFirst,
			IMongoRepository<DataCollectedEvent> repo) => {
				var results = await repo.FindAsync(filter: x => 
					(x.UserId == httpContext.User.GetUserId()) &&
					(configId == null || x.ConfigId == configId) &&
					(correlationId == null || x.CorrelationId == correlationId),
					page, pageSize, oldFirst);

				return Results.Ok(
					TinyMapper.Map<List<DataResultDto>>(results)
				);
			}).RequireAuthorization();

		group.MapGet("/{id}", async (
			HttpContext httpContext,
			Guid id,
			IMongoRepository<DataCollectedEvent> repo) => {
				var result = await repo.FindAsync(filter: x =>
					x.UserId == httpContext.User.GetUserId()
					&& x.Id == id);

				return Results.Ok(
					TinyMapper.Map<List<DataResultDto>>(result)
				);
			}).RequireAuthorization();
	}
}