using CollectorService;
using CollectorService.Extensions;
using CollectorService.Interfaces;
using CollectorService.Services;
using Common.Contracts;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Models;
using Common.Messaging;
using Nelibur.ObjectMapper;

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

TinyMapper.Bind<InboundDataDto, DataCollectedEvent>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
//app.UseHttpsRedirection();

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapCollectorEndpoints();

app.Run();