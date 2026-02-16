using Common.Contracts.Parser;

namespace Common.Interfaces.Parser;

public interface IDataParser {
	Task<ParserDataPayload> ParseAsync(IDictionary<string, string>? parameters);
	Task<IEnumerable<LookupOptionDto>> GetParameterLookupsAsync(string parameterName) =>
		Task.FromResult(Enumerable.Empty<LookupOptionDto>());
}
