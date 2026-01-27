using System.Linq.Expressions;

namespace Common.Interfaces;

public interface IMongoRepository<T> where T : class {
	Task CreateAsync(T entity);
	Task<List<T>> GetAllAsync();
	Task<List<T>> GetBySourceAsync(string source, int? page, int? pageSize);
	Task<List<T>> FindAsync(Expression<Func<T, bool>> filter);
}