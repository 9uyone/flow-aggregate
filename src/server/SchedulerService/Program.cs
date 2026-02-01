using Common.Extensions;
using Common.Models;
using Hangfire;
using SchedulerService;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<ParserConfig>("parser_user_configs");

builder.Services.AddAppHangfire();

var app = builder.Build();

app.UseHangfireDashboard("/hangfire", new DashboardOptions {
	Authorization = new[] { new MyDashboardAuthFilter() }
});

RecurringJob.AddOrUpdate<ParserSyncJob>(
	"sync-all-parsers",
	job => job.UpdateScheduleAsync(),
	"*/5 * * * *" // every 5 minutes
);

app.Run();