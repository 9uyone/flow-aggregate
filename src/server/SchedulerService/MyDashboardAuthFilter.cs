using Hangfire.Dashboard;
using System.Security.Claims;

namespace SchedulerService;

public class MyDashboardAuthFilter : IDashboardAuthorizationFilter {
	//private readonly string _allowedUserId = "";

	public bool Authorize(DashboardContext context) {
		var httpContext = context.GetHttpContext();

		//var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

		if (httpContext.Request.Host.Host == "localhost") return true;

		return false;
		//return userId == _allowedUserId;
	}
}