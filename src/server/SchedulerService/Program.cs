using CollectorService.Interfaces;
using Common.Constants;
using Common.Extensions;
using Common.Messaging;
using Common.Models;
using Hangfire;
using SchedulerService;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<ParserUserConfig>(MongoCollections.ParserUserConfigs);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();

builder.Services.AddAppHangfire();

var app = builder.Build();

app.UseHangfireDashboard("/hangfire", new DashboardOptions {
	Authorization = new[] { new MyDashboardAuthFilter() }
});

app.UseExceptionHandler();

RecurringJob.AddOrUpdate<ParserSyncJob>(
	"sync-all-parsers",
	job => job.UpdateScheduleAsync(),
	"*/5 * * * *" // every 5 minutes
);


app.Run();