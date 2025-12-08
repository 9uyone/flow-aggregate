namespace Common.Config;

public record ApiSecrets
{
    public string? CollectorApiKey { get; init; }
}