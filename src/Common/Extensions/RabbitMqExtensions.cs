using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace Common.Extensions;

public static class RabbitMqExtensions {
	public static IServiceCollection AddRabbit(this IServiceCollection services, IConfiguration configuration) {
		services.AddMassTransit(x =>
		{
			x.AddConsumers(Assembly.GetEntryAssembly());

			x.UsingRabbitMq((context, cfg) =>
			{
				var section = configuration.GetSection("RABBITMQ");
				cfg.Host(section["HOST"], "/", h => {
					h.Username(section["USER"]);
					h.Password(section["PASS"]);
				});

				cfg.ConfigureEndpoints(context);
			});
		});

		return services;
	}
}