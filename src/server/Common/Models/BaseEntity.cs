using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Text;

namespace Common.Models;

public abstract class BaseEntity {
	[BsonId]
	[BsonRepresentation(BsonType.String)]
	public string Id { get; init; } = ObjectId.GenerateNewId().ToString();

	public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}