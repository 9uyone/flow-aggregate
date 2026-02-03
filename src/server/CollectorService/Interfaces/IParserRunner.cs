using Common.Contracts;
using Common.Models;

namespace CollectorService.Services;

public interface IParserRunner {
	Task<InboundDataDto> ExecuteAsync(
		RunParserCommand command
	);
}