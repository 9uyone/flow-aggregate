using CollectorService.Interfaces;
using Common.Contracts.Events;
using Common.Entities;
using Common.Interfaces;
using Hangfire;
using Hangfire.Storage;
using NCrontab;

namespace SchedulerService;

public class ParserSyncJob(
	IMongoRepository<ParserUserConfig> repo,
	IIntegrationDispatcher dispatcher,
	ILogger<ParserSyncJob> logger)
{
	public async Task UpdateScheduleAsync() {
		var activeConfigs = await GetAllActiveInternalConfigsAsync();
		var expectedJobIds = new HashSet<string>();

		foreach (var config in activeConfigs) {
			if (CrontabSchedule.TryParse(config.Internal?.CronExpression) == null) {
				logger.LogWarning("Invalid cron expression for ParserConfig {ConfigId}: {CronExpression}", config.Id, config.Internal?.CronExpression);
				continue;
			}

			var jobId = $"run-parser-{config.Id}";
			RecurringJob.AddOrUpdate(jobId, () => SendCommandAsync(config), config.Internal!.CronExpression);
			expectedJobIds.Add(jobId);
		}

		using var connection = JobStorage.Current.GetConnection();
		var existingJobs = connection.GetRecurringJobs();

		foreach (var job in existingJobs) {
			if (job.Id.StartsWith("run-parser-") && !expectedJobIds.Contains(job.Id)) {
				RecurringJob.RemoveIfExists(job.Id);
				logger.LogInformation("Removed stale recurring job {JobId}", job.Id);
			}
		}
	}

	public async Task SendCommandAsync(ParserUserConfig config) {
		await dispatcher.DispatchAsync(new RunParserEvent {
			ConfigId = config.Id!,
			ParserName = config.ParserName,
			UserId = config.UserId,
			Options = config.Internal?.Options,
		});
	}

	private async Task<List<ParserUserConfig>> GetAllActiveInternalConfigsAsync() {
		var result = new List<ParserUserConfig>();
		int page = 1;
		const int pageSize = 100;
		int totalCount;

		do {
			var (items, total) = await repo.FindAsync(
				c => c.IsEnabled == true && c.SourceType == Common.Enums.ParserSourceType.Internal,
				page, pageSize);
			result.AddRange(items);
			totalCount = total;
			page++;
		} while (result.Count < totalCount);

		return result;
	}
}
