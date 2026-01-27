using Common.Enums;

namespace CollectorService.Models;

public record ParserDetailsDto(
	string Name,
	string DisplayName,
	string Description,
	DataType Type,
	List<ParameterDetailsDto> Parameters);