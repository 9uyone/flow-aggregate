using Common.Config;
using Common.Interfaces.Parser;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Extensions;

public static class HttpClientExtensions {
	public static void AddMyHttpClient(this IServiceCollection services) {
		services.AddHttpClient<IHttpRestClient, HttpRestClient>(options => {
			options.BaseAddress = BackendDiscovery.InternalGateway;
		});
	}
}