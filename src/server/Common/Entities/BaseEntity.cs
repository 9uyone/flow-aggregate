using MongoDB.Bson.Serialization.Attributes;

namespace Common.Entities;

public abstract class BaseEntity {
	[BsonId]
	public Guid Id { get; init; } = Guid.NewGuid();//.ToString();

	public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}