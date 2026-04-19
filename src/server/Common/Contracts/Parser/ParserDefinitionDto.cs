using Common.Enums;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Contracts.Events;

[BsonIgnoreExtraElements]
public class ParserDefinitionDto {
	public required string Slug { get; set; }
	public string DisplayName { get; set; } = string.Empty;
	public string Description { get; set; } = string.Empty;
	public IEnumerable<string>? MetricFields { get; set; }
	public IEnumerable<string>? Dimensions { get; set; }
	public bool SupportsScheduledRun { get; set; }
	public bool SupportsManualRun { get; set; }
	public bool SupportsPushIngest { get; set; }
	public bool SupportsParameters { get; set; }
	public required ParserSourceType SourceType { get; init; }
	public Guid? OwnerUserId { get; set; }
}
