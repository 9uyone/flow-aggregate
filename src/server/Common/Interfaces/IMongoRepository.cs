using MongoDB.Driver;
using System.Linq.Expressions;

namespace Common.Interfaces;

public interface IMongoRepository<T> where T : class {
	Task<T> CreateAsync(T entity);

	Task<T> GetByIdAsync(Guid id);
	Task<(List<T> items, int totalCount)> FindAsync(Expression<Func<T, bool>> filter, int? page = 1, int? pageSize = 10, bool? oldFirst = false);
	Task<bool> AnyAsync(Expression<Func<T, bool>> filter);

	Task<ReplaceOneResult> ReplaceOneAsync(Expression<Func<T, bool>> filter, T entity);
	Task<UpdateResult> UpdateOneAsync(Expression<Func<T, bool>> filter, UpdateDefinition<T> update);

	Task<DeleteResult> DeleteAsync(Expression<Func<T, bool>> filter);
}