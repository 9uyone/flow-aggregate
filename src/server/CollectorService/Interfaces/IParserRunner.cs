using Common.Contracts.Events;
using Common.Contracts.Parser;

namespace CollectorService.Services;

public interface IParserRunner {
	Task<IEnumerable<ParserDataPayload>> ExecuteAsync(
		RunParserEvent command
	);
}