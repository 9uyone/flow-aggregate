using Common.Interfaces;
using MongoDB.Driver;
using System.Linq.Expressions;
using Common.Extensions;

namespace Common.Repositories;

public class MongoRepository<T>(IMongoDatabase database, string collectionName) : IMongoRepository<T> where T : class {
	private readonly IMongoCollection<T> _collection = database.GetCollection<T>(collectionName);

	public async Task<T> CreateAsync(T entity) => 
		await _collection.InsertOneAsync(entity)
			.ContinueWith(_ => entity);

	public Task<T> GetByIdAsync(Guid id) =>
		_collection.Find(Builders<T>.Filter.Eq("_id", id)).FirstOrDefaultAsync();

	public async Task<(List<T> items, int totalCount)> FindAsync(Expression<Func<T, bool>> filter, int? page, int? pageSize, bool? oldFirst) {
		int totalCount = (int)await _collection.CountDocumentsAsync(filter);
		var actualPageSize = PagedExtensions.GetActualPageSize(pageSize);
		var actualPage = Math.Max(page ?? 1, 1);
		var skipCount = (actualPage - 1) * actualPageSize;

		var items = await _collection.Find(filter)
			.Sort(oldFirst == true ? Builders<T>.Sort.Ascending("Timestamp") : Builders<T>.Sort.Descending("Timestamp"))
			.Skip(skipCount)
			.Limit(actualPageSize)
			.ToListAsync();
		
		return (items, totalCount);
	}

	public async Task<ReplaceOneResult> ReplaceOneAsync(Expression<Func<T, bool>> filter, T entity) =>
		await _collection.ReplaceOneAsync(filter, entity);

	public async Task<UpdateResult> UpdateOneAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update) =>
		await _collection.UpdateOneAsync(filter, update);

	public async Task<DeleteResult> DeleteAsync(Expression<Func<T, bool>> filter) =>
		await _collection.DeleteOneAsync(filter);
}