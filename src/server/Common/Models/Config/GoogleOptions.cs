using Microsoft.Extensions.Configuration;

namespace Common.Config;

public class GoogleOptions {
	[ConfigurationKeyName("client_id")]
	public string ClientId { get; set; }

	[ConfigurationKeyName("client_secret")]
	public string ClientSecret { get; set; }
}