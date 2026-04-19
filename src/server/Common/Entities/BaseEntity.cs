using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Entities;

public abstract class BaseEntity {
	[BsonId]
	[BsonGuidRepresentation(GuidRepresentation.Standard)]
	public Guid Id { get; init; } = Guid.NewGuid();

	public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
