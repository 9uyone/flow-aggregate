using Common.Contracts;
using Common.Entities;
using Common.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace StorageService.Entities;

public class ExecutionLog : BaseEntity, ICorrelatedMessage {
	public required string ParserName { get; set; }
	public required Guid UserId { get; set; }
	public Guid? CorrelationId { get; set; }
	public Guid? ConfigId { get; set; } // null для Ad-hoc

	[BsonRepresentation(BsonType.String)]
	public required ExecutionStatus Status { get; set; }
	public string? ErrorMessage { get; set; }

	//public string? Source { get; set; } // "api.openweathermap.org"
	public DateTime FinishedAtUtc { get; set; } = DateTime.UtcNow;

	public IDictionary<string, string>? Options { get; set; }
}