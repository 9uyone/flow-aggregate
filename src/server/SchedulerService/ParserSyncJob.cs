using CollectorService.Interfaces;
using Common.Contracts;
using Common.Contracts.Events;
using Common.Contracts.ParserConfig;
using Common.Extensions;
using Common.Interfaces.Parser;
using Hangfire;
using Hangfire.Storage;
using NCrontab;

namespace SchedulerService;

public class ParserSyncJob(
	IHttpRestClient httpClient,
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

	public async Task SendCommandAsync(ParserConfigDto config) {
		await dispatcher.DispatchAsync(new RunParserEvent {
			ConfigId = config.Id,
			ParserName = config.ParserName,
			UserId = config.UserId,
			Options = config.Internal?.Options,
			CorrelationId = Guid.GenCorrelationId()
		});
	}

	private async Task<List<ParserConfigDto>> GetAllActiveInternalConfigsAsync() {
		var result = new List<ParserConfigDto>();
		int page = 1;
		const int pageSize = 100;
		int totalCount;

		do {
			var response = await httpClient.GetAsync<PagedResponse<ParserConfigDto>>(
				$"/internal/storage/parser-cfg/active-internal?page={page}&pageSize={pageSize}");
			if (response == null) break;
			result.AddRange(response.Items);
			totalCount = response.TotalCount;
			page++;
		} while (result.Count < totalCount);

		return result;
	}
}
