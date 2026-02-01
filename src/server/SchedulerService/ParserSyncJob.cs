using Common.Contracts;
using Common.Interfaces;
using Common.Models;
using Hangfire;
using MassTransit;

namespace SchedulerService;

public class ParserSyncJob(
	IMongoRepository<ParserConfig> repo,
	IPublishEndpoint publishEndpoint)
{
	public async Task UpdateScheduleAsync() {
		var activeConfigs = await repo.FindAsync(c => c.IsEnabled);
		foreach (var config in activeConfigs) {
			RecurringJob.AddOrUpdate(
				$"run-parser-{config.Id}",
				() => SendCommandAsync(config),
				config.CronExpression);
		}
	}

	public async Task SendCommandAsync(ParserConfig config) {
		await publishEndpoint.Publish(new RunParserCommand {
			ConfigId = config.Id!,
			ParserName = config.ParserName,
			UserId = config.UserId,
			Options = config.Options
		});
	}
}
