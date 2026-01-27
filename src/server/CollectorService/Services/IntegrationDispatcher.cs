using CollectorService.Interfaces;
using Common.Exceptions;
using MassTransit;

namespace Gateway.Services;

public class IntegrationDispatcher(
	IPublishEndpoint publishEndpoint,
	ILogger<IntegrationDispatcher> logger) : IIntegrationDispatcher {
	public async Task DispatchAsync<T>(T message) where T : class {
		try {
			logger.LogInformation("Dispatching {MessageType} to RabbitMQ. Content: {@Message}",
				typeof(T).Name, message);

			await publishEndpoint.Publish(message, context =>
			{
				// Можна додати заголовки (Headers), які потім зчитає Процесор
				context.Headers.Set("SentAt", DateTime.UtcNow);
			});

			logger.LogDebug("Message of type {MessageType} published successfully", typeof(T).Name);
		}
		catch (Exception ex) {
			logger.LogError(ex, "CRITICAL: Failed to publish message {MessageType}", typeof(T).Name);
			throw new ExternalServiceException("Message Broker is currently unavailable. Please try again later.");
		}
	}
}
