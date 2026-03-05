using Common.Constants;
using Common.Extensions;
using Common.Entities;
using StorageService.Endpoints;
using Common.Config;
using Common.Contracts.Events;
using StorageService.Entities;
using CollectorService.Interfaces;
using Common.Messaging;
using StorageService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Configuration.LoadFromEnvFile(builder.Environment);

builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<DataCollectedEvent>(MongoCollections.CollectedData);
builder.Services.AddAppMongoRepository<ParserUserConfig>(MongoCollections.ParserUserConfigs);
builder.Services.AddAppMongoRepository<ExecutionLog>(MongoCollections.ExecutionLogs);
builder.Services.AddAppMongoRepository<ParserDefinition>(MongoCollections.ParserDefinitions);

builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddRedisCache(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();

builder.Services.AddScoped<ParserConfigService>();
builder.Services.AddScoped<ParserConfigInternalService>();
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();
builder.Services.AddMyHttpClient();

var app = builder.Build();

if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
}

app.UseExceptionHandler();
app.UseHealthChecks("/health");

app.UseAuthentication();
app.UseAuthorization();

app.MapParserConfigEndpoints();
app.MapInternalParserConfigEndpoints();
app.MapCollectedDataEndpoints();
app.MapTasksEndpoints();

app.Run();