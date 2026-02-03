using Common.Constants;
using Common.Contracts;
using Common.Extensions;
using Common.Models;
using StorageService.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();

builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<DataCollectedEvent>(MongoCollections.CollectedData);
builder.Services.AddAppMongoRepository<ParserUserConfig>(MongoCollections.ParserUserConfigs);

var app = builder.Build();

if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseExceptionHandler();

app.UseAuthentication();
app.UseAuthorization();

app.MapParserConfigEndpoints();
//app.MapCollectedDataEndpoints();

app.Run();