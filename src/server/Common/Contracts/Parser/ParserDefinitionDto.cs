using Common.Enums;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Contracts.Events;

[BsonIgnoreExtraElements]
public class ParserDefinitionDto {
	public required string Slug { get; set; }
	public string DisplayName { get; set; } = string.Empty;
	public string Description { get; set; } = string.Empty;
	public IEnumerable<string>? MetricFields { get; set; }
	public required ParserSourceType SourceType { get; init; }
	public Guid? OwnerUserId { get; set; }
}