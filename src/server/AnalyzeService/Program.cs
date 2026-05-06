using AnalyzeService;
using AnalyzeService.Services;
using Common.Config;
using Common.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);

builder.Services.AddHealthChecks();
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddRedisCache(builder.Configuration);
builder.Services.AddMyHttpClient();
builder.Services.AddSingleton<AnalyticsCache>();
builder.Services.AddScoped<IHistoryQueryService, HistoryQueryService>();
builder.Services.AddScoped<IAnalyticsStatsService, AnalyticsStatsService>();
builder.Services.AddScoped<IAdvancedAnalyticsService, AdvancedAnalyticsService>();
builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAI"));
builder.Services.AddHttpClient<IAiModelClient, OpenAiModelClient>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseHealthChecks("/health");

app.UseAuthentication();
app.UseAuthorization();

app.MapEndpoints();

app.Run();