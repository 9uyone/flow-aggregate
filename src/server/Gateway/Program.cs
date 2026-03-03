using Common.Config;
using Common.Extensions;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
	.AddOcelot(reloadOnChange: true)
	.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
	.LoadFromEnvFile(builder.Environment);

// Register services
builder.Services.AddOcelot(builder.Configuration);
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddProblemDetails();
builder.Services.AddGlobalExceptionHandler();

builder.Services.AddCors(options => {
	options.AddPolicy("AllowFrontend",
		policy => {
			policy.WithOrigins("http://localhost:3000")
				  .AllowAnyHeader()
				  .AllowAnyMethod();
				  //.AllowCredentials(); // Use with caution, often required for authenticated requests
		});
});


var app = builder.Build();

//app.UseHttpsRedirection();
app.UseExceptionHandler();

app.Use(async (context, next) => {
	var path = context.Request.Path.Value!;
	if (path.Length > 1 && path.EndsWith("/"))
		context.Request.Path = path.TrimEnd('/');
	await next();
});

app.Use(async (context, next) => {
if (context.Request.Path.StartsWithSegments("/internal")) {
		var expectedPort = BackendDiscovery.InternalGateway.Port;
		if (context.Connection.LocalPort != expectedPort) {
			context.Response.StatusCode = StatusCodes.Status403Forbidden;
			return;
		}
	}
	await next();
});

/*app.Use(async (context, next) => {
	// Копіюємо IP-адресу відправника в заголовок, який чекає Ocelot
	if (!context.Request.Headers.ContainsKey("X-Client-Id")) {
		context.Request.Headers.Add("X-Client-Id", context.Connection.RemoteIpAddress?.ToString() ?? "unknown");
	}
	await next();
});*/

app.UseCors("AllowFrontend");

await app.UseOcelot();

app.Run();