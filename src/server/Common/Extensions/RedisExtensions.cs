using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Extensions;

public static class RedisExtensions {
	public static void AddRedisCache(this IServiceCollection services, IConfiguration config) {
		services.AddStackExchangeRedisCache(options => {
			var section = config.GetSection("Redis");

			if (section == null) {
				throw new InvalidOperationException("Redis configuration section is missing.");
			}

			var host = section.GetValue<string>("Host");
			var port = section.GetValue<int>("Port");
			var password = section.GetValue<string>("Pass");

			if (string.IsNullOrEmpty(host) || port == 0) {
				throw new InvalidOperationException("Redis host or port is not configured properly.");
			}

			options.Configuration = $"{host}:{port},password={password}";
		});
	}
}
