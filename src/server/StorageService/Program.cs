using Common.Contracts;
using Common.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<DataCollectedEvent>("InboundData");

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGet("/source/{src}", async (string src, int? page, int? pageSize, IServiceProvider sp) => {
    var repo = sp.GetRequiredService<Common.Interfaces.IMongoRepository<DataCollectedEvent>>();
    var results = await repo.GetBySourceAsync(src, page, pageSize);
    return Results.Ok(results);
});

app.Run();
