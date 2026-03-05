using Common.Contracts.Events;
using Common.Contracts.ParserConfig;
using MongoDB.Bson.Serialization.Attributes;

namespace Common.Contracts;

[BsonIgnoreExtraElements]
public class ParserFullContextDto : ParserConfigDto {
	public ParserDefinitionDto? Definition { get; init; }
}