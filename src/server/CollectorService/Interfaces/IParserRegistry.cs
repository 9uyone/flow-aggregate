using CollectorService.Models;

namespace CollectorService.Interfaces;

public interface IParserRegistry {
	Type? GetParserType(string name);
	IEnumerable<ParserDescriptorDto> GetAvailableParsers();
	Task<ParserDetailsDto?> GetParserDetailsAsync(string name);
}