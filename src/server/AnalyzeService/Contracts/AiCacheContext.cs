namespace AnalyzeService.Contracts;

public sealed record AiCacheContext(long Hits, long Misses, double HitRate);
