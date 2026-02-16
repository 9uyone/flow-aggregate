using CollectorService.Interfaces;
using Common.Constants;
using Common.Extensions;
using Common.Messaging;
using Common.Entities;
using Hangfire;
using SchedulerService;
using Common.Config;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<ParserUserConfig>(MongoCollections.ParserUserConfigs);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddAppHangfire();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseExceptionHandler();
app.UseHealthChecks("/health");
app.UseHangfireDashboard();

RecurringJob.AddOrUpdate<ParserSyncJob>(
	"sync-all-parsers",
	job => job.UpdateScheduleAsync(),
	"*/5 * * * *" // every 5 minutes
);

app.Run();