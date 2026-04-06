using Common.Contracts.Parser;

namespace CollectorService.Contracts;

public record ParameterDetailsDto(
	string Name,
	string Description,
	bool IsRequired,
	bool allowCustomValues,
	IEnumerable<LookupOptionDto> Options);