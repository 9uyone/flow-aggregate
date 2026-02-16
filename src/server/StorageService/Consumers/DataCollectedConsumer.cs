using MassTransit;
using Common.Interfaces;
using Common.Contracts.Events;

namespace ProcessorService.Consumers;

public class DataCollectedConsumer(IMongoRepository<DataCollectedEvent> repo, ILogger<DataCollectedEvent> logger) : IConsumer<DataCollectedEvent> {
	public async Task Consume(ConsumeContext<DataCollectedEvent> context) {
		await repo.CreateAsync(context.Message);

		logger.LogInformation($"[Mongo]: Data has been saved; GUID {context.Message.Id}");
	}
}