using CollectorService.Interfaces;
using Common.Attributes;
using Common.Contracts;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces.Parser;
using Common.Models;
using MassTransit;
using Nelibur.ObjectMapper;
using System.Reflection;

namespace CollectorService.Services;

public class ParserRunner(
	IParserRegistry registry,
	IServiceProvider sp,
	IIntegrationDispatcher dispatcher) : IParserRunner 
{
	public async Task<InboundDataDto> ExecuteAsync(
		string parserName, 
		string userId, 
		IDictionary<string, string>? options,
		Guid? correlationId)
	{
		var parserType = registry.GetParserType(parserName);
		if (parserType == null)
			throw new ParserNotFoundException(parserName);

		var parser = sp.GetRequiredService(parserType) as IDataParser;
		var info = parserType.GetCustomAttribute<ParserInfoAttribute>();
		var data = await parser.ParseAsync(options);

		var ev = TinyMapper.Map<DataCollectedEvent>(data);
		ev.UserId = userId;
		ev.ParserName = info.Name;
		ev.Type = info.DataType;
		ev.CorrelationId = correlationId.EnsureCorrelationId();

		await dispatcher.DispatchAsync(ev);

		return data;
	}
}
