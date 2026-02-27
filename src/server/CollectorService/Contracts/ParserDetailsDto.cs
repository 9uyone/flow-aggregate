using Common.Enums;

namespace CollectorService.Contracts;

public record ParserDetailsDto(
	string Name,
	string DisplayName,
	string Description,
	List<ParameterDetailsDto> Parameters);