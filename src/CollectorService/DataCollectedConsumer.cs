using MassTransit;
using Common.Contracts;

namespace CollectorService;

public class DataCollectedConsumer(ILogger<DataCollectedConsumer> logger) : IConsumer<DataCollectedEvent> {
	public async Task Consume(ConsumeContext<DataCollectedEvent> context) {
		var data = context.Message;

		logger.LogInformation(
			"🚀 [ОТРИМАНО]: {Timestamp} - ID: {Id} - Значення: {Value}",
			data.Timestamp,
			data.Id,
			data.Value
		);

		await Task.CompletedTask;
	}
}
