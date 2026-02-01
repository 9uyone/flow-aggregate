using Common.Contracts;
using MassTransit;

namespace Common.Filters;

public class CorrelationFilter<T> : IFilter<PublishContext<T>> where T : class {
	public async Task Send(PublishContext<T> context, IPipe<PublishContext<T>> next) {
		// If message supports correlation and CorrelationId is not set — generate it.
		if (context.Message is ICorrelatedMessage correlated && correlated.CorrelationId == Guid.Empty) {
			var correlationId = NewId.NextGuid();

			// Prefer setting MT context CorrelationId (used for headers, tracing, etc.)
			context.CorrelationId ??= correlationId;

			// Also try to set it on the message instance if it has a writable CorrelationId property.
			// This avoids forcing all correlated messages to have settable members, while still supporting them.
			try {
				var prop = typeof(T).GetProperty(
					nameof(ICorrelatedMessage.CorrelationId),
					System.Reflection.BindingFlags.Instance |
					System.Reflection.BindingFlags.Public |
					System.Reflection.BindingFlags.NonPublic);

				if (prop is { CanWrite: true } && prop.PropertyType == typeof(Guid))
					prop.SetValue(context.Message, correlationId);
			}
			catch {
				// Ignore: message may be immutable or property may not be writable.
			}
		}
		else if (context.Message is ICorrelatedMessage correlatedHasId && correlatedHasId.CorrelationId != Guid.Empty) {
			// If message already has an ID, ensure MT context is aligned.
			context.CorrelationId ??= correlatedHasId.CorrelationId;
		}

		await next.Send(context);
	}

	public void Probe(ProbeContext context) => context.CreateFilterScope(nameof(CorrelationFilter<T>));
}