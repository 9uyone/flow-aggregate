namespace Common.Config;

public static class BackendDiscovery {
	public static Uri InternalGateway {
		get {
			var internalUrl = Environment.GetEnvironmentVariable("INTERNAL_GATEWAY_URL");
			if (!string.IsNullOrEmpty(internalUrl)) return new Uri(internalUrl);

			bool isDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";

			return isDocker ? new Uri("http://gateway:5005") : new Uri("http://localhost:5005");
		}
	}
}