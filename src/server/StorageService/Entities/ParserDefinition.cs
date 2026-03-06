using Common.Entities;
using Common.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace StorageService.Entities;

public class ParserDefinition: BaseEntity {
	public required string Slug { get; set; }
	public required string DisplayName { get; set; }
	public string Description { get; set; } = string.Empty;

	public IEnumerable<string> MetricFields { get; set; } = Enumerable.Empty<string>();
	[BsonRepresentation(BsonType.String)]
	public ParserSourceType SourceType { get; init; }
	public Guid? OwnerUserId { get; set; } = null;
	public DateTime UpdatedAt { get; set; }
}