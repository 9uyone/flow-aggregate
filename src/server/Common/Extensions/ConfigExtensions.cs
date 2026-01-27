using Common.Config;
using DotNetEnv;
using DotNetEnv.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Common.Extensions;

public static class ConfigExtensions {
	public static IServiceCollection AddJwtOptions(this IServiceCollection services, IConfiguration config) {
		services.Configure<JwtOptions>(config.GetSection("JWT"));
		return services;
	}

	public static IServiceCollection AddGoogleOptions(this IServiceCollection services, IConfiguration config) {
		services.Configure<GoogleOptions>(config.GetSection("GOOGLE"));
		return services;
	}

	public static IConfigurationBuilder LoadFromEnvFile(this IConfigurationBuilder configuration, IHostEnvironment environment) {
		configuration.AddDotNetEnv(".env", LoadOptions.TraversePath(LoadOptions.NoClobber()));
		if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true")
			configuration.AddDotNetEnv(".env.local", LoadOptions.TraversePath());

		return configuration;
	}
}