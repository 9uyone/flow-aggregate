using Microsoft.Extensions.Configuration;

namespace Common.Config;

public class JwtOptions {
	public string Key { get; set; }
	public string Issuer { get; set; }
	public string Audience { get; set; }

	[ConfigurationKeyName("AT_LIFETIME_HOURS")]
	public uint AccessTokenLifetimeHours { get; set; }

	[ConfigurationKeyName("RT_LIFETIME_DAYS")]
	public uint RefreshTokenLifetimeDays { get; set; }
}