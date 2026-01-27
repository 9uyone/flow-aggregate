using Common.Extensions;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load config
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: false, reloadOnChange: true);
builder.Configuration.LoadFromEnvFile(builder.Environment);

// Register services
builder.Services.AddOcelot(builder.Configuration);
builder.Services.AddAppRabbit(builder.Configuration);
builder.Services.AddAppAuthentication(builder.Configuration);

var app = builder.Build();

//app.UseHttpsRedirection();

app.Use(async (context, next) => {
	var path = context.Request.Path.Value!;
	if (path.Length > 1 && path.EndsWith("/"))
		context.Request.Path = path.TrimEnd('/');
	await next();
});

await app.UseOcelot();

app.Run();