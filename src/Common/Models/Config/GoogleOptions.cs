using Microsoft.Extensions.Configuration;
using System.Text.Json.Serialization;

namespace Common.Config;

public class GoogleOptions {
	[ConfigurationKeyName("client_id")]
	public string ClientId { get; set; }

	[ConfigurationKeyName("client_secret")]
	public string ClientSecret { get; set; }
}