namespace Common.Interfaces;

public interface IMongoRepository<T> where T : class {
	Task CreateAsync(T entity);
	Task<List<T>> GetAllAsync();
	Task<List<T>> GetBySourceAsync(string source);
}