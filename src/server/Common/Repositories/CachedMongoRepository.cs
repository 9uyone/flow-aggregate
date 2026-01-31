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

	public Task<List<T>> FindAsync(Expression<Func<T, bool>> filter) =>
		inner.FindAsync(filter);

	public Task<List<T>> GetAllAsync() =>
		inner.GetAllAsync();

	public async Task<T> GetByIdAsync(string id) {
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

	public Task<List<T>> GetBySourceAsync(string source, int? page, int? pageSize) =>
		inner.GetBySourceAsync(source, page, pageSize);

	public async Task ReplaceOneAsync(Expression<Func<T, bool>> filter, T entity) {
		await inner.ReplaceOneAsync(filter, entity);

		var id = (entity as dynamic)?.Id?.ToString();
		if (!string.IsNullOrEmpty(id)) {
			await cache.RemoveAsync($"{typeof(T).Name}:{id}");
		}
	}

	public async Task UpdateOneAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update) {
		var entity = await inner.FindAsync(filter);
		if (entity != null) {
			var id = (entity as dynamic)?.Id?.ToString();
			if (!string.IsNullOrEmpty(id)) {
				await cache.RemoveAsync($"{typeof(T).Name}:{id}");
			}
		}
		await inner.UpdateOneAsync(filter, update);
	}

	public async Task DeleteAsync(Expression<Func<T, bool>> filter) {
		var entities = await inner.FindAsync(filter);
		foreach (var entity in entities) {
			var id = (entity as dynamic)?.Id?.ToString();
			if (!string.IsNullOrEmpty(id)) {
				await cache.RemoveAsync($"{typeof(T).Name}:{id}");
			}
		}
		await inner.DeleteAsync(filter);
	}

	// ВАЖЛИВО: В методах Update/Delete додай await cache.RemoveAsync($"{typeof(T).Name}:{id}");
	// Щоб у кеші не лишалися "протухлі" дані.
}