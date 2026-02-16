using CollectorService.Interfaces;
using Common.Contracts;
using Common.Entities;
using Common.Interfaces;
using Hangfire;
using NCrontab;

namespace SchedulerService;

public class ParserSyncJob(
	IMongoRepository<ParserUserConfig> repo,
	IIntegrationDispatcher dispatcher,
	ILogger<ParserSyncJob> logger)
{
	public async Task UpdateScheduleAsync() {
		var activeConfigs = await repo.FindAsync(c => c.IsEnabled == true);
		//var activeConfigs = await repo.GetAllAsync();
		
		foreach (var config in activeConfigs) {
			if (CrontabSchedule.TryParse(config.CronExpression) == null)
				logger.LogWarning("Invalid cron expression for ParserConfig {ConfigId}: {CronExpression}", config.Id, config.CronExpression);

			RecurringJob.AddOrUpdate(
				$"run-parser-{config.Id}",
				() => SendCommandAsync(config),
				config.CronExpression);
		}

		/*// Remove jobs for configs that no longer exist in the database
		var allConfigIds = (await repo.FindAsync(c => true)).Select(c => $"run-parser-{c.Id}").ToHashSet();
		var monitoringApi = JobStorage.Current.GetMonitoringApi();
		var existingJobIds = monitoringApi.ScheduledJobs(0, int.MaxValue).Select(j => j.Key).ToHashSet();

		foreach (var jobId in existingJobIds) {
			if (jobId.StartsWith("run-parser-") && !allConfigIds.Contains(jobId)) {
				RecurringJob.RemoveIfExists(jobId);
				logger.LogInformation("Removed recurring job {JobId} for deleted config", jobId);
			}
		}*/
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
