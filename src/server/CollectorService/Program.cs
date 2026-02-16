using CollectorService;
using CollectorService.Extensions;
using CollectorService.Interfaces;
using CollectorService.Services;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Messaging;
using Nelibur.ObjectMapper;
using Common.Contracts.Parser;
using Common.Config;
using Common.Contracts.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);

builder.Services.AddOpenApi();
builder.Services.AddAuthorization();
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddHttpClient<IHttpRestClient, HttpRestClient>();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddScoped<IParserRunner, ParserRunner>();
builder.Services.AddSingleton<IParserRegistry, ParserRegistry>();
builder.Services.AddInternalParsers();
//builder.Services.AddExternalPlugins(Path.Combine(builder.Environment.ContentRootPath, "plugins"));
builder.Services.AddHealthChecks();

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