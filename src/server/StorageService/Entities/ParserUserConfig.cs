using Common.Enums;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Entities;

public class ParserUserConfig: BaseEntity {
	public required Guid UserId { get; init; }
	public required string ParserSlug { get; init; }

	[BsonRepresentation(MongoDB.Bson.BsonType.String)]
	public required ParserSourceType SourceType { get; init; }

	public bool IsEnabled { get; init; } = true;

	public DateTime? LastRunAt { get; set; }
	public bool? LastStatus { get; set; }
	public string? LastErrorMessage { get; set; }

	public InternalOptions? Internal { get; set; }
	public ExternalOptions? External { get; set; }
}

public class InternalOptions {
	public string? CustomName { get; init; }
	public required string CronExpression { get; init; }
	public IDictionary<string, string>? Options { get; init; }// = new Dictionary<string, string>();
}

public class ExternalOptions {
	public required string TokenHash { get; init; }
}