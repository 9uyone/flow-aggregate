using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace AnalyzeService.Services;

public sealed class AnalyticsCache(IDistributedCache cache) {
	private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
	private long aiSummaryCacheHits;
	private long aiSummaryCacheMisses;

	public (long Hits, long Misses, double HitRate) GetAiSummaryCacheStats() {
		var hits = Interlocked.Read(ref aiSummaryCacheHits);
		var misses = Interlocked.Read(ref aiSummaryCacheMisses);
		var total = hits + misses;
		var hitRate = total == 0 ? 0 : hits * 100d / total;
		return (hits, misses, hitRate);
	}

	public void TrackAiSummaryCacheUsage(bool fromCache) {
		if (fromCache)
			Interlocked.Increment(ref aiSummaryCacheHits);
		else
			Interlocked.Increment(ref aiSummaryCacheMisses);
	}

	public async Task<T?> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<Task<T?>> factory, CancellationToken cancellationToken = default) {
		var cached = await cache.GetStringAsync(key, cancellationToken);
		if (!string.IsNullOrWhiteSpace(cached)) {
			var fromCache = JsonSerializer.Deserialize<T>(cached, JsonOptions);
			if (fromCache is not null)
				return fromCache;
		}

		var value = await factory();
		if (value is null)
			return default;

		var payload = JsonSerializer.Serialize(value, JsonOptions);
		await cache.SetStringAsync(key, payload, new DistributedCacheEntryOptions {
			AbsoluteExpirationRelativeToNow = ttl
		}, cancellationToken);

		return value;
	}

	public async Task<(T? Value, bool FromCache)> GetOrCreateWithStateAsync<T>(string key, TimeSpan ttl, Func<Task<T?>> factory, CancellationToken cancellationToken = default) {
		var cached = await cache.GetStringAsync(key, cancellationToken);
		if (!string.IsNullOrWhiteSpace(cached)) {
			var fromCache = JsonSerializer.Deserialize<T>(cached, JsonOptions);
			if (fromCache is not null)
				return (fromCache, true);
		}

		var value = await factory();
		if (value is null)
			return (default, false);

		var payload = JsonSerializer.Serialize(value, JsonOptions);
		await cache.SetStringAsync(key, payload, new DistributedCacheEntryOptions {
			AbsoluteExpirationRelativeToNow = ttl
		}, cancellationToken);

		return (value, false);
	}

	public static string BuildKey(string prefix, string slug, IReadOnlyDictionary<string, string?> query) {
		var queryPart = string.Join("&", query
			.OrderBy(x => x.Key, StringComparer.Ordinal)
			.Select(x => $"{x.Key}={x.Value}"));

		return $"analyze:{prefix}:{slug}:{queryPart}";
	}
}
