using CollectorService.Interfaces;
using Common.Contracts;
using Common.Exceptions;
using Common.Extensions;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Common.Messaging;

public class IntegrationDispatcher(
	IPublishEndpoint publishEndpoint,
	ILogger<IntegrationDispatcher> logger) : IIntegrationDispatcher {
	public async Task DispatchAsync<T>(T message) where T : class {
		try {
			if (message is ICorrelatedMessage correlated)
				correlated.CorrelationId.EnsureCorrelationId();

			logger.LogInformation("Dispatching {MessageType} to RabbitMQ. Content: {@Message}",
				typeof(T).Name, message);

			await publishEndpoint.Publish(message, context =>
			{
				if (message is ICorrelatedMessage correlated)
					context.CorrelationId = correlated.CorrelationId;

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
