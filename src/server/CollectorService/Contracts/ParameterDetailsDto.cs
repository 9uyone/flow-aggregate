using Common.Contracts.Parser;

namespace CollectorService.Contracts;

public record ParameterDetailsDto(
	string Slug,
	string Description,
	bool IsRequired,
	IEnumerable<LookupOptionDto> Options);