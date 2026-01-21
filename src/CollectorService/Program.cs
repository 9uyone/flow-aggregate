using CollectorService.Interfaces;
using Common.Config;
using Common.Extensions;
using Gateway.Models;
using Gateway.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddOpenApi();
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddScoped<IIntegrationDispatcher, IntegrationDispatcher>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapPost("/ingest", async (InboundDataDto dto, IIntegrationDispatcher dispatcher) => {
	if (dto.Value < -50 || dto.Value > 100)
		return Results.BadRequest("Value is not valid");

	// 2. Мапінг у Event (можна AutoMapper, але краще руками для швидкості)
	var @event = new Common.Contracts.DataCollectedEvent(
		Id: Guid.NewGuid(),
		Value: dto.Value.ToString(),
		Timestamp: DateTime.UtcNow,
		Metadata: dto.Metadata
	);

	await dispatcher.DispatchAsync(@event);
	return Results.Accepted();
});

//app.UseHttpsRedirection();

app.Run();