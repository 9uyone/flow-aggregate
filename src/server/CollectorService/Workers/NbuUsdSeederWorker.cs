using CollectorService.Interfaces;
using CollectorService.Parsers.NbuUsd;
using Common.Contracts.Events;
using Common.Extensions;

namespace CollectorService.Workers;

internal sealed class NbuUsdSeederWorker(
	IServiceScopeFactory scopeFactory,
	IConfiguration configuration,
	ILogger<NbuUsdSeederWorker> logger) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
		var section = configuration.GetSection("Seeder:NbuUsd");
		if (!section.GetValue("Enabled", false))
			return;

		var userIdRaw = section["UserId"];
		if (!Guid.TryParse(userIdRaw, out var userId)) {
			logger.LogWarning("NBU USD seeder is enabled but Seeder:NbuUsd:UserId is missing or invalid");
			return;
		}

		var days = Math.Clamp(section.GetValue("Days", 20), 1, 3650);
		var delayMs = Math.Clamp(section.GetValue("DelayMs", 200), 0, 10000);
		var valcode = section.GetValue<string>("Valcode") ?? "USD";

		await Task.Delay(1000, stoppingToken);
		logger.LogInformation("NBU USD seeder started. Days: {Days}, Currency: {Valcode}", days, valcode);

		using var scope = scopeFactory.CreateScope();
		var parser = scope.ServiceProvider.GetRequiredService<NbuCurrencyParser>();
		var dispatcher = scope.ServiceProvider.GetRequiredService<IIntegrationDispatcher>();

		for (int i = 0; i < days && !stoppingToken.IsCancellationRequested; i++) {
			var targetDate = DateTime.UtcNow.AddDays(-i);

			try {
				var results = await parser.ParseAsync(new Dictionary<string, string> {
					["valcode"] = valcode,
					["date"] = targetDate.ToString("yyyyMMdd")
				});

				foreach (var rate in results) {
					var dataEvent = new DataCollectedEvent {
						CorrelationId = Guid.GenCorrelationId(),
						ParserSlug = "nbu-exchange",
						Category = rate.Category,
						Source = rate.Source,
						Metric = rate.Metric,
						CapturedAt = targetDate,
						Value = rate.Value,
						RawContent = rate.RawContent,
						Metadata = rate.Metadata,
						UserId = userId,
					};

					await dispatcher.DispatchAsync(dataEvent);
					logger.LogInformation("[Seeder] Sent {Metric} rate for {Date}: {Value}", dataEvent.Metric, targetDate.ToString("yyyy-MM-dd"), dataEvent.Value);
				}
			}
			catch (Exception ex) {
				logger.LogError(ex, "[Seeder] Failed to fetch/send data for {Date}", targetDate.ToString("yyyy-MM-dd"));
			}

			if (delayMs > 0)
				await Task.Delay(delayMs, stoppingToken);
		}

		logger.LogInformation("NBU USD seeder finished");
	}
}