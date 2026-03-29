using Common.Enums;

namespace CollectorService.Contracts;

public record ParserDetailsDto(
	string Slug,
	string DisplayName,
	string Description,
	ParserSourceType SourceType,
	IEnumerable<string>? MetricFields,
	IEnumerable<ParameterDetailsDto> Parameters
);