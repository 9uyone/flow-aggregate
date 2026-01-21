namespace CollectorService.Interfaces;

public interface IIntegrationDispatcher {
	Task DispatchAsync<T>(T message) where T : class;
}
