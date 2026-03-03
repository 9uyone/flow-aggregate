using Common.Interfaces;

namespace Storage.Contracts;

public class DataResultDto: ICorrelatedMessage {
	public required Guid Id { get; init; }
	public required Guid? CorrelationId { get; set; }

	public required string ParserName { get; init; }
	public required string Source { get; init; }

	public required string Metric { get; init; }

	public decimal? Value { get; init; }

	public required string Type { get; init; }
	public Dictionary<string, string>? Metadata { get; init; }

	public Guid? ConfigId { get; init; }
};