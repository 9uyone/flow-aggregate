using Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using MongoDB.Driver;
using System.Linq.Expressions;
using System.Text.Json;

namespace Common.Repositories;

public class CachedMongoRepository<T>(
	IMongoRepository<T> inner,
	IDistributedCache cache) : IMongoRepository<T> where T : class {
	public Task<T> CreateAsync(T entity) =>
		inner.CreateAsync(entity);

	public async Task<T> GetByIdAsync(Guid id) {
		var key = $"{typeof(T).Name}:{id}";
		var cached = await cache.GetStringAsync(key);

		if (!string.IsNullOrEmpty(cached))
			return JsonSerializer.Deserialize<T>(cached);

		var entity = await inner.GetByIdAsync(id);
		if (entity != null) {
			await cache.SetStringAsync(key, JsonSerializer.Serialize(entity),
				new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) });
		}
		return entity!;
	}

	public Task<(List<T> items, int totalCount)> FindAsync(Expression<Func<T, bool>> filter, int? page, int? pageSize, bool? oldFirst) =>
		inner.FindAsync(filter, page, pageSize, oldFirst);

	public Task<bool> AnyAsync(Expression<Func<T, bool>> filter) =>
		inner.AnyAsync(filter);

	public async Task<ReplaceOneResult> ReplaceOneAsync(Expression<Func<T, bool>> filter, T entity) {
		var result = await inner.ReplaceOneAsync(filter, entity);

		var id = (entity as dynamic)?.Id?.ToString();
		if (!string.IsNullOrEmpty(id)) {
			await cache.RemoveAsync($"{typeof(T).Name}:{id}");
		}
		return result;
	}

	public async Task<UpdateResult> UpdateOneAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update) {
		var (entity, _) = await inner.FindAsync(filter);
		if (entity != null) {
			var id = (entity as dynamic)?.Id?.ToString();
			if (!string.IsNullOrEmpty(id)) {
				await cache.RemoveAsync($"{typeof(T).Name}:{id}");
			}
		}
		return await inner.UpdateOneAsync(filter, update);
	}

	public async Task<DeleteResult> DeleteAsync(Expression<Func<T, bool>> filter) {
		var (entities, _) = await inner.FindAsync(filter);
		foreach (var entity in entities) {
			var id = (entity as dynamic)?.Id?.ToString();
			if (!string.IsNullOrEmpty(id)) {
				await cache.RemoveAsync($"{typeof(T).Name}:{id}");
			}
		}
		return await inner.DeleteAsync(filter);
	}
}