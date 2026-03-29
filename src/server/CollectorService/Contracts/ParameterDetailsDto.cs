using Common.Contracts.Parser;

namespace CollectorService.Contracts;

public record ParameterDetailsDto(
	string Name,
	string Description,
	bool IsRequired,
	IEnumerable<LookupOptionDto> Options);