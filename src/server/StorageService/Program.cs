using Common.Constants;
using Common.Extensions;
using Common.Entities;
using StorageService.Endpoints;
using Common.Config;
using Common.Contracts.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Configuration.LoadFromEnvFile(builder.Environment);

builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<DataCollectedEvent>(MongoCollections.CollectedData);
builder.Services.AddAppMongoRepository<ParserUserConfig>(MongoCollections.ParserUserConfigs);

builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseExceptionHandler();
app.UseHealthChecks("/health");

app.UseAuthentication();
app.UseAuthorization();

app.MapParserConfigEndpoints();
app.MapCollectedDataEndpoints();

app.Run();