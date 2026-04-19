using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace AnalyzeService.Services;

public sealed class AnalyticsCache(IDistributedCache cache) {
	private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

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

	public static string BuildKey(string prefix, string slug, IReadOnlyDictionary<string, string?> query) {
		var queryPart = string.Join("&", query
			.OrderBy(x => x.Key, StringComparer.Ordinal)
			.Select(x => $"{x.Key}={x.Value}"));

		return $"analyze:{prefix}:{slug}:{queryPart}";
	}
}
