using Common.Attributes;
using Common.Interfaces.Parser;
using System.Reflection;

namespace CollectorService.Extensions
{
    public static class ServiceCollectionExtensions
    {
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

		public static IServiceCollection AddExternalPlugins(this IServiceCollection services, string pluginsPath) {
			if (!Directory.Exists(pluginsPath)) return services;

            var files = Directory.GetFiles(pluginsPath, "*.dll");
            foreach (var file in files) {
                var assembly = Assembly.LoadFrom(file);
                var types = assembly.GetTypes()
                    .Where(t => typeof(IDataParser).IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract)
                    .Where(t => t.GetCustomAttribute<ParserInfoAttribute>() != null);

				foreach (var type in types) {
					services.AddTransient(type);
					services.AddTransient(typeof(IDataParser), sp => sp.GetRequiredService(type));
				}
			}
            return services;
		}
    }
}