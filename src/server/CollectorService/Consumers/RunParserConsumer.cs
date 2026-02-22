using CollectorService.Services;
using Common.Contracts;
using Common.Contracts.Events;
using MassTransit;

namespace ProcessorService.Consumers;

public class RunParserConsumer(IParserRunner runner, ILogger<RunParserCommand> logger) : IConsumer<RunParserCommand> {
	public async Task Consume(ConsumeContext<RunParserCommand> context) {
		var msg = context.Message;
		try {
			logger.LogInformation($"[Collector]; Parser {msg.ParserName} has been started; Config ID {msg.ConfigId}");

			await runner.ExecuteAsync(msg);

			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserName,
				IsSuccess = true,
				FinishedAtUtc = DateTime.UtcNow,
				Options = msg.Options,
			});

			logger.LogInformation($"[Collector]; Parser {msg.ParserName} has been finished; Config ID {msg.ConfigId}");
		}
		catch (Exception ex) {
			await context.Publish(new ParserStatusUpdatedEvent {
				ConfigId = msg.ConfigId,
				CorrelationId = msg.CorrelationId,
				UserId = msg.UserId,
				ParserName = msg.ParserName,
				IsSuccess = false,
				ErrorMessage = ex.Message,
				FinishedAtUtc = DateTime.UtcNow,
				Options = msg.Options,
			});

			throw;
		}
	}
}