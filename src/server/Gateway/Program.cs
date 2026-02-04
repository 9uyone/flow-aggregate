using Common.Extensions;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load config
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: false, reloadOnChange: true);
builder.Configuration.LoadFromEnvFile(builder.Environment);

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

app.UseCors("AllowFrontend");
await app.UseOcelot();

app.Run();