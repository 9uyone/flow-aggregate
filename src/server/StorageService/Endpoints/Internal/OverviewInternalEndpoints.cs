using Common.Constants;
using Common.Contracts.Events;
using Common.Enums;
using Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using StorageService.Entities;
using StorageService.Services;

namespace StorageService.Endpoints;

public static partial class StorageEndpoints {
	private sealed record StorageOverviewDto(
		int TotalRecords,
		int RecordsLastDay,
		int InternalParsers,
		int PluginParsers,
		int ExternalParsers,
		double SuccessRateLast100,
		int RunsConsidered);

	public static void MapOverviewInternalEndpoints(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("/internal/storage/overview");

		group.MapGet("/", async (
			[FromQuery] Guid userId,
			IMongoRepository<DataCollectedEvent> collectedRepo,
			IMongoRepository<ExecutionLog> executionRepo,
			ParserCatalogService parserCatalogService) => {
			var totalFilter = Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId);
			var totalRecords = (int)await collectedRepo.CountAsync(totalFilter);

			var since = DateTime.UtcNow.AddDays(-1);
			var dayFilter = Builders<DataCollectedEvent>.Filter.Eq(x => x.UserId, userId)
				& Builders<DataCollectedEvent>.Filter.Gte(x => x.CapturedAt, since);
			var recordsLastDay = (int)await collectedRepo.CountAsync(dayFilter);

			var parsers = await parserCatalogService.GetAllAsync(userId);
			var internalParsers = parsers.Count(x => string.Equals(x.SourceType, "Internal", StringComparison.OrdinalIgnoreCase));
			var pluginParsers = parsers.Count(x => string.Equals(x.SourceType, "Plugin", StringComparison.OrdinalIgnoreCase));
			var externalParsers = parsers.Count(x => string.Equals(x.SourceType, "External", StringComparison.OrdinalIgnoreCase));

			var runFilter = Builders<ExecutionLog>.Filter.Eq(x => x.UserId, userId)
				& Builders<ExecutionLog>.Filter.Ne(x => x.Status, ExecutionStatus.Running);
			var runSort = Builders<ExecutionLog>.Sort.Descending(x => x.StartedAt);
			var (runs, _) = await executionRepo.FindAsync(runFilter, runSort, 1, 100);
			var runsConsidered = runs.Count;
			var successCount = runs.Count(x => x.Status == ExecutionStatus.Success);
			var successRate = runsConsidered == 0 ? 0 : successCount * 100d / runsConsidered;

			return Results.Ok(new StorageOverviewDto(
				totalRecords,
				recordsLastDay,
				internalParsers,
				pluginParsers,
				externalParsers,
				successRate,
				runsConsidered));
		});
	}
}
