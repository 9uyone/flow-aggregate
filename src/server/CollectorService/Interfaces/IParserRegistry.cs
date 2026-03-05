using CollectorService.Contracts;

namespace CollectorService.Interfaces;

public interface IParserRegistry {
	Type? GetParserType(string slug);
	IEnumerable<ParserDescriptorDto> GetAvailableParsers();
	Task<ParserDetailsDto?> GetParserDetailsAsync(string slug);
}