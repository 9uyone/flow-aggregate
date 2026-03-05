namespace CollectorService.Contracts;

public record ParserDetailsDto(
	string Slug,
	string DisplayName,
	string Description,
	IEnumerable<ParameterDetailsDto> Parameters
);