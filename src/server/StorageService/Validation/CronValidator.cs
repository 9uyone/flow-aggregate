using NCrontab;

namespace StorageService.Validation;

internal static class CronValidator {
	public static bool TryValidate(string cronExpression, int minIntervalSeconds, out string? error) {
		error = null;

		var schedule = CrontabSchedule.TryParse(cronExpression);
		if (schedule is null) {
			error = "Invalid Cron expression format";
			return false;
		}

		var now = DateTime.UtcNow;

		try {
			var n1 = schedule.GetNextOccurrence(now);
			var n2 = schedule.GetNextOccurrence(n1);

			var deltaSeconds = (n2 - n1).TotalSeconds;
			if (deltaSeconds < minIntervalSeconds) {
				error = $"Cron expression is too frequent. Minimum interval is {minIntervalSeconds} seconds.";
				return false;
			}

			return true;
		}
		catch (Exception) {
			error = "Invalid Cron expression";
			return false;
		}
	}
}