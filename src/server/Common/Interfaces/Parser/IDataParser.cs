using Common.Models;

namespace Common.Interfaces.Parser;

public interface IDataParser {
	Task<InboundDataDto> ParseAsync(IDictionary<string, string>? parameters);
	Task<IEnumerable<LookupOptionDto>> GetParameterLookupsAsync(string parameterName) =>
		Task.FromResult(Enumerable.Empty<LookupOptionDto>());
}
