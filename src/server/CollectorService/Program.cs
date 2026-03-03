using CollectorService;
using CollectorService.Interfaces;
using CollectorService.Services;
using Common.Extensions;
using Common.Messaging;
using Nelibur.ObjectMapper;
using Common.Contracts.Parser;
using Common.Config;
using Common.Contracts.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
var pluginsPath = builder.Configuration.GetValue<string>("PluginsPath") ?? Path.Combine(builder.Environment.ContentRootPath, "Plugins");

using var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
var logger = loggerFactory.CreateLogger("PluginLoader");
builder.Services.AddInternalParsers();
builder.Services.AddExternalPlugins(pluginsPath, logger);

builder.Services.AddOpenApi();
builder.Services.AddAuthorization();
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddMyHttpClient();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IParserRunner, ParserRunner>();
builder.Services.AddSingleton<IParserRegistry, ParserRegistry>();
builder.Services.AddHealthChecks();
builder.Services.AddRedisCache(builder.Configuration);

TinyMapper.Bind<ParserDataPayload, DataCollectedEvent>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
//app.UseHttpsRedirection();

app.UseExceptionHandler();
app.UseHealthChecks("/health");

app.UseAuthentication();
app.UseAuthorization();

app.MapCollectorEndpoints();

app.Run();