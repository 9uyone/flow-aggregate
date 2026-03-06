using Common.Constants;
using Common.Contracts.Events;
using MassTransit;
using MongoDB.Driver;
using StorageService.Entities;

namespace StorageService.Consumers;

public class ParsersDiscoveredConsumer(IMongoDatabase db) : IConsumer<ParsersDiscoveredEvent> {
	public readonly IMongoCollection<ParserDefinition> collection = db.GetCollection<ParserDefinition>(MongoCollections.ParserDefinitions);

	public async Task Consume(ConsumeContext<ParsersDiscoveredEvent> context) {
		foreach (var dto in context.Message.Parsers) {
			var filter = Builders<ParserDefinition>.Filter.Eq(x => x.Slug, dto.Slug);

			var update = Builders<ParserDefinition>.Update
				.Set(x => x.Slug, dto.Slug)
				.Set(x => x.MetricFields, dto.MetricFields)
				.Set(x => x.SourceType, dto.SourceType)
				.Set(x => x.DisplayName, dto.DisplayName)
				.Set(x => x.Description, dto.Description)
				.SetOnInsert(x => x.OwnerUserId, dto.OwnerUserId)
				.SetOnInsert(x => x.UpdatedAt, DateTime.UtcNow);

			var result = await collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });

			if (result.ModifiedCount > 0) {
				await collection.UpdateOneAsync(filter, Builders<ParserDefinition>.Update.Set(x => x.UpdatedAt, DateTime.UtcNow));
			}
		}
	}
}