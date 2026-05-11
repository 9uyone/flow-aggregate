using Common.Enums;

namespace CollectorService.Contracts;

public record ParserDescriptorDto(
	string Slug,
	string DisplayName,
	string Description,
	ParserSourceType SourceType,
	IEnumerable<string>? MetricFields,
	IEnumerable<string>? Dimensions,
	bool SupportsScheduledRun,
	bool SupportsManualRun,
	bool SupportsPushIngest,
	bool SupportsParameters
);
