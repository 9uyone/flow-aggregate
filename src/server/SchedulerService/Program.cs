using CollectorService.Interfaces;
using Common.Extensions;
using Common.Messaging;
using Hangfire;
using SchedulerService;
using Common.Config;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddMyHttpClient();
builder.Services.AddAppHangfire();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseExceptionHandler();
app.UseHealthChecks("/health");

using (var scope = app.Services.CreateScope()) {
	var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();

	recurringJobManager.AddOrUpdate<ParserSyncJob>(
		"sync-all-parsers",
		job => job.UpdateScheduleAsync(),
		"*/5 * * * *"
	);
}
app.UseHangfireDashboard();

app.Run();