using CollectorService.Interfaces;
using Common.Contracts;
using Common.Interfaces;
using Common.Models;
using Hangfire;
using MassTransit;
using NCrontab;

namespace SchedulerService;

public class ParserSyncJob(
	IMongoRepository<ParserUserConfig> repo,
	IIntegrationDispatcher dispatcher,
	ILogger<ParserSyncJob> logger)
{
	public async Task UpdateScheduleAsync() {
		var activeConfigs = await repo.FindAsync(c => c.IsEnabled);
		foreach (var config in activeConfigs) {
			if (CrontabSchedule.TryParse(config.CronExpression) == null)
				logger.LogWarning("Invalid cron expression for ParserConfig {ConfigId}: {CronExpression}", config.Id, config.CronExpression);

			RecurringJob.AddOrUpdate(
				$"run-parser-{config.Id}",
				() => SendCommandAsync(config),
				config.CronExpression);
		}
	}

	public async Task SendCommandAsync(ParserUserConfig config) {
		await dispatcher.DispatchAsync(new RunParserCommand {
			ConfigId = config.Id!,
			ParserName = config.ParserName,
			UserId = config.UserId,
			Options = config.Options,
		});
	}
}
