using Common.Contracts.Parser;

namespace CollectorService.Contracts;

public class InboundDataDto: ParserDataPayload {
	public required Guid ConfigId { get; set; }
}