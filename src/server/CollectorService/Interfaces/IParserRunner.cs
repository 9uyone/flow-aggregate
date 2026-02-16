using Common.Contracts;
using Common.Contracts.Parser;

namespace CollectorService.Services;

public interface IParserRunner {
	Task<ParserDataPayload> ExecuteAsync(
		RunParserCommand command
	);
}