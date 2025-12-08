using Common.Config;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// 1. Додаємо спільну конфігурацію
builder.Configuration.AddSharedConfiguration(builder.Environment);

// 2. Завантажуємо конфігурацію Ocelot
builder.Configuration.AddJsonFile($"ocelot.{builder.Environment.EnvironmentName}.json", optional: false, reloadOnChange: true);

// 3. Реєструємо сервіси
builder.Services.AddServiceUrls(builder.Configuration);
builder.Services.AddOcelot(builder.Configuration);

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