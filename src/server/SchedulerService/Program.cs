using CollectorService.Interfaces;
using Common.Config;
using Common.Extensions;
using Common.Messaging;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using SchedulerService;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddMyHttpClient();
builder.Services.AddAppHangfire();
builder.Services.AddHealthChecks();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddScoped<ParserSyncJob>();

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
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/scheduler/sync-parsers", async ([FromServices] ParserSyncJob job) => {
	await job.UpdateScheduleAsync();
	return Results.Ok(new { Message = "Parser sync schedule updated." });
});

app.Run();