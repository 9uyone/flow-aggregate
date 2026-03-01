namespace Common.Interfaces.Parser;

public interface IHttpRestClient {
	Task<T?> GetAsync<T>(string url);
}
