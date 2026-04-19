namespace AnalyzeService.Services;

internal static class AnalyticsTimeRangeResolver {
	public static bool TryResolvePreset(string range, out DateTime from, out DateTime to, out string interval) {
		var now = DateTime.UtcNow;

		switch (range.Trim().ToLowerInvariant()) {
			case "day":
				from = now.AddDays(-1);
				to = now;
				interval = "hour";
				return true;
			case "week":
				from = now.AddDays(-7);
				to = now;
				interval = "day";
				return true;
			case "month":
				from = now.AddMonths(-1);
				to = now;
				interval = "week";
				return true;
			case "quarter":
			case "3m":
			case "3-month":
			case "3 months":
				from = now.AddMonths(-3);
				to = now;
				interval = "week";
				return true;
			case "year":
			case "1y":
				from = now.AddYears(-1);
				to = now;
				interval = "month";
				return true;
			case "all":
			case "all-time":
			case "all time":
				from = DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
				to = now;
				interval = "month";
				return true;
			default:
				from = default;
				to = default;
				interval = string.Empty;
				return false;
		}
	}

	public static string InferInterval(DateTime from, DateTime to) {
		var span = to - from;
		return span <= TimeSpan.FromDays(2)
			? "hour"
			: span <= TimeSpan.FromDays(90)
				? "day"
				: span <= TimeSpan.FromDays(365)
					? "week"
					: "month";
	}

	public static bool IsSupportedInterval(string interval) => interval is "hour" or "day" or "week" or "month";
}
