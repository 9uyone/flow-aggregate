using Common.Config;
using Common.Contracts;
using Common.Extensions;
using MassTransit;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load Ocelot config
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: false, reloadOnChange: true);
builder.Configuration.LoadFromEnvFile(builder.Environment);

// Register services
builder.Services.AddServiceUrls(builder.Configuration);
builder.Services.AddOcelot(builder.Configuration);
builder.Services.AddRabbit(builder.Configuration);

var app = builder.Build();

//app.UseHttpsRedirection();

await app.UseOcelot();

app.Use(async (context, next) => {
	var path = context.Request.Path.Value!;
	if (path.Length > 1 && path.EndsWith("/"))
		context.Request.Path = path.TrimEnd('/');
	await next();
});

// Minimal API test endpoint
app.MapPost("/send-test", async (IPublishEndpoint publishEndpoint) => {
	var message = new DataCollectedEvent(Guid.NewGuid(), "Тестове значення від Остапа", DateTime.UtcNow);
	await publishEndpoint.Publish(message);

	return Results.Ok(new { Message = "Подія відправлена в RabbitMQ", Data = message });
});

app.Run();