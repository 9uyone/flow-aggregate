using CollectorService.Interfaces;
using Common.Contracts.Events;

namespace CollectorService.Workers;

internal class ParserDiscoveryWorker(
	IServiceScopeFactory scopeFactory,
	IParserRegistry registry,
	ILogger<ParsersDiscoveredEvent> logger) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
		using var scope = scopeFactory.CreateScope();
		var dispatcher = scope.ServiceProvider.GetRequiredService<IIntegrationDispatcher>();

		await Task.Delay(1000, stoppingToken);
		logger.LogInformation("Discovering parsers...");

		try {
			var parsers = registry.GetAvailableParsers()
				.Select(p => new ParserDefinitionDto {
					Slug = p.Slug,
					Description = p.Description,
					DisplayName = p.DisplayName,
					MetricFields = p.MetricFields,
					SourceType = p.SourceType,
				})
				.ToList();

			await dispatcher.DispatchAsync(new ParsersDiscoveredEvent {
				Parsers = parsers
			});

			logger.LogInformation("Discovered {Count} parsers", parsers.Count);
		}
		catch (Exception ex) {
			logger.LogError(ex, "Error during parser discovery");
		}
	}
}