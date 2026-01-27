namespace Common.Config;

public class JwtOptions {
	public string Key { get; set; }
	public string Issuer { get; set; }
	public string Audience { get; set; }
	public uint LifetimeHours { get; set; }
}