using Common.Attributes;
using Common.Interfaces.Parser;
using System.Reflection;

namespace CollectorService;

public static class ParsersPluginsExtensions {
	public static IServiceCollection AddInternalParsers(this IServiceCollection services) {
        var types = Assembly.GetExecutingAssembly().GetTypes()
            .Where(t => typeof(IDataParser).IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract)
            .Where(t => t.GetCustomAttribute<ParserInfoAttribute>() != null);

        foreach (var type in types) {
            services.AddTransient(type);
            services.AddTransient(typeof(IDataParser), sp => sp.GetRequiredService(type));
		}

		return services;
	}

	public static IServiceCollection AddExternalPlugins(this IServiceCollection services, string pluginsPath, ILogger logger) {
		if (!Directory.Exists(pluginsPath)) {
			Directory.CreateDirectory(pluginsPath);
			return services;
		}

        var files = Directory.GetFiles(pluginsPath, "*.dll");
        foreach (var file in files) {
			try {
				var loadContext = new PluginLoadContext(file);
				var assembly = loadContext.LoadFromAssemblyPath(file);

				var types = assembly.GetTypes()
					.Where(t => typeof(IDataParser).IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract)
					.Where(t => t.GetCustomAttribute<ParserInfoAttribute>() != null);

				foreach (var type in types) {
					services.AddTransient(type);
					services.AddTransient(typeof(IDataParser), sp => sp.GetRequiredService(type));
				}
			}
			catch (Exception ex) {
				logger.LogError(ex, "Failed to load plugin from {FilePath}", file);
			}
		}
        return services;
	}
}