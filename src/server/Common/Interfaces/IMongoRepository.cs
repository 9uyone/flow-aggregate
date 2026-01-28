using System.Linq.Expressions;

namespace Common.Interfaces;

public interface IMongoRepository<T> where T : class {
	Task CreateAsync(T entity);
	Task<List<T>> GetAllAsync();
	Task<T> GetByIdAsync(string id);
	Task<List<T>> GetBySourceAsync(string source, int? page, int? pageSize);
	Task<List<T>> FindAsync(Expression<Func<T, bool>> filter);
	Task ReplaceOneAsync(Expression<Func<T, bool>> filter, T entity);
	Task<T> InsertOneAsync(T entity);
}