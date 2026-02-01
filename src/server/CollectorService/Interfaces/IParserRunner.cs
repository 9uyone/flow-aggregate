using Common.Contracts;
using Common.Models;

namespace CollectorService.Services;

public interface IParserRunner {
	Task<InboundDataDto> ExecuteAsync(
		string parserName, 
		string userId,
		IDictionary<string, string>? options,
		Guid? correlationId
	);
}