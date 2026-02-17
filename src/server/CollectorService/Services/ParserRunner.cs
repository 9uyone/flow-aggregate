using CollectorService.Interfaces;
using Common.Attributes;
using Common.Contracts;
using Common.Contracts.Events;
using Common.Contracts.Parser;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces.Parser;
using Nelibur.ObjectMapper;
using System.Reflection;

namespace CollectorService.Services;

public class ParserRunner(
	IParserRegistry registry,
	IServiceProvider sp,
	IIntegrationDispatcher dispatcher) : IParserRunner 
{
	public async Task<IEnumerable<ParserDataPayload>> ExecuteAsync(
		RunParserCommand command)
	{
		var parserType = registry.GetParserType(command.ParserName);
		if (parserType == null)
			throw new ParserNotFoundException(command.ParserName);

		var parser = sp.GetRequiredService(parserType) as IDataParser;
		var info = parserType.GetCustomAttribute<ParserInfoAttribute>();
		var data = await parser.ParseAsync(command.Options);

		foreach (var entry in data) {
			var ev = TinyMapper.Map<DataCollectedEvent>(entry);
			ev.UserId = command.UserId;
			ev.ParserName = info.Name;
			ev.Type = info.DataType;
			ev.CorrelationId = command.CorrelationId.EnsureCorrelationId();
			ev.ConfigId = command.ConfigId;

			await dispatcher.DispatchAsync(ev);
		}

		return data;
	}
}