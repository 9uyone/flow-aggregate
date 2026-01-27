using CollectorService.Interfaces;
using MassTransit;

namespace Gateway.Services;

public class IntegrationDispatcher(
	IPublishEndpoint publishEndpoint,
	ILogger<IntegrationDispatcher> logger) : IIntegrationDispatcher {
	public async Task DispatchAsync<T>(T message) where T : class {
		try {
			// Тут можна додати загальну логіку для всіх вхідних повідомлень:
			// - Збагачення метаданими (час отримання, ID гейтвею)
			// - Спільне логування

			logger.LogInformation("Dispatching integration message of type {MessageType}", typeof(T).Name);
			await publishEndpoint.Publish<T>(message);

			logger.LogDebug("Message published successfully");
		}
		catch (Exception ex) {
			logger.LogError(ex, "Failed to dispatch integration message of type {MessageType}", typeof(T).Name);
			throw;
		}
	}
}
