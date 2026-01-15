using DotNetEnv;
using DotNetEnv.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Common.Config;

public static class EnvExtensions {
	public static IServiceCollection AddServiceUrls(this IServiceCollection services, IConfiguration config) {
		services.Configure<ServiceUrls>(config.GetSection("ServiceUrls"));
		return services;
	}

	public static IServiceCollection AddApiSecrets(this IServiceCollection services, IConfiguration config) {
		services.Configure<ApiSecrets>(config.GetSection("ApiSecrets"));
		return services;
	}

	public static IConfigurationBuilder LoadFromEnvFile(this IConfigurationBuilder configuration, IHostEnvironment environment) {
		configuration.AddDotNetEnv(".env", LoadOptions.TraversePath(LoadOptions.NoClobber()));
		if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true")
			configuration.AddDotNetEnv(".env.local", LoadOptions.TraversePath());

		return configuration;
	}
}