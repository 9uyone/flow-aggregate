namespace Common.Contracts.Events;

public class ParsersDiscoveredEvent {
	public IEnumerable<ParserDefinitionDto> Parsers { get; set; }
}