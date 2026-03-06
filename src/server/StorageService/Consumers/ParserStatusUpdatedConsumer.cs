using Common.Interfaces;
using Common.Entities;
using MassTransit;
using MongoDB.Driver;
using Common.Contracts.Events;
using StorageService.Entities;
using Common.Enums;

namespace ProcessorService.Consumers;

public class ParserStatusUpdatedConsumer(
		IMongoRepository<ParserUserConfig> configRepo, 
		IMongoRepository<ExecutionLog> logRepo) : IConsumer<ParserStatusUpdatedEvent> {
	public async Task Consume(ConsumeContext<ParserStatusUpdatedEvent> context) {
		var message = context.Message;

		var updateConfig = Builders<ParserUserConfig>.Update
			.Set(c => c.LastRunAt, message.FinishedAt)
			.Set(c => c.LastStatus, message.IsSuccess)
			.Set(c => c.LastErrorMessage, message.ErrorMessage);

		await configRepo.UpdateOneAsync(c => c.Id == message.ConfigId, updateConfig);

		await logRepo.CreateAsync(new ExecutionLog { 
			ParserSlug = message.ParserName,
			UserId = message.UserId,
			CorrelationId = message.CorrelationId,
			ConfigId = message.ConfigId,
			Status = message.IsSuccess ? ExecutionStatus.Success : ExecutionStatus.Failed,
			ErrorMessage = message.ErrorMessage,
			FinishedAt = message.FinishedAt,
			Options = message.Options,
		});
	}
}