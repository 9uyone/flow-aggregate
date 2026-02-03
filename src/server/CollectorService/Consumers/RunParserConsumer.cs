using CollectorService.Services;
using Common.Contracts;
using MassTransit;

namespace ProcessorService.Consumers;

public class RunParserConsumer(IParserRunner runner, ILogger<RunParserCommand> logger) : IConsumer<RunParserCommand> {
	public async Task Consume(ConsumeContext<RunParserCommand> context) {
		var msg = context.Message;

		await runner.ExecuteAsync(new RunParserCommand {
			ParserName = msg.ParserName,
			UserId = msg.UserId!,
			Options = msg.Options,
			CorrelationId = msg.CorrelationId
		});

		logger.LogInformation($"[Collector]; Parser {msg.ParserName} has been started; Config ID {msg.ConfigId}");
	}
}