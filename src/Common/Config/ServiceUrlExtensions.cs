using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Common.Config;

public static class ServiceUrlExtensions {
	public static IServiceCollection AddServiceUrls(this IServiceCollection services, IConfiguration config) {
		services.Configure<ServiceUrls>(config.GetSection("ServiceUrls"));
		return services;
	}

	public static IServiceCollection AddApiSecrets(this IServiceCollection services, IConfiguration config) {
		services.Configure<ApiSecrets>(config.GetSection("ApiSecrets"));
		return services;
	}

	public static IConfigurationBuilder AddSharedConfiguration(this IConfigurationBuilder configuration, IHostEnvironment environment)
	{
		// Шлях до батьківської папки солюшена (де лежить .sln файл)
		var solutionRoot = Path.Combine(environment.ContentRootPath, "..");
		var sharedConfigFile = Path.Combine(solutionRoot, $"shared.{environment.EnvironmentName}.json");
		
		configuration.AddJsonFile(sharedConfigFile, optional: true, reloadOnChange: true);
		return configuration;
	}
}
