using Common.Enums;

namespace Common.Contracts.Parser;

public record ParserParameterDetailsDto(
	string Name,
	string Description,
	bool IsRequired,
	bool allowCustomValues,
	IEnumerable<LookupOptionDto> Options);

public record ParserDetailsDto(
	string Slug,
	string DisplayName,
	string Description,
	ParserSourceType SourceType,
	IEnumerable<string>? MetricFields,
	IEnumerable<string>? Dimensions,
	bool SupportsScheduledRun,
	bool SupportsManualRun,
	bool SupportsPushIngest,
	bool SupportsParameters,
	IEnumerable<ParserParameterDetailsDto> Parameters);
