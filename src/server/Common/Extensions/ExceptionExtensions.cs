using Microsoft.Extensions.DependencyInjection;

namespace Common.Extensions;

public static class ExceptionExtensions {
	public static IServiceCollection AddGlobalExceptionHandler(this IServiceCollection services) {
		services.AddProblemDetails();
		services.AddExceptionHandler<GlobalExceptionHandler>();
		return services;
	}
}
