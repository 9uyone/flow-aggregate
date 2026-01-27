using ProcessorService;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<Worker>();

// Додаємо логування (Serilog або стандартний NLog/Console)
builder.Logging.AddConsole();

var host = builder.Build();

host.Run();
