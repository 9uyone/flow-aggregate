using CollectorService.Interfaces;
using CollectorService.Models;
using Common.Attributes;
using Common.Exceptions;
using Common.Interfaces.Parser;
using System.Reflection;

namespace CollectorService.Services;

public class ParserRegistry(IServiceProvider sp) : IParserRegistry {
	private sealed record ParserRegistration(Type ParserType, ParserInfoAttribute Info);

	private readonly Dictionary<string, ParserRegistration> _parsers = new(StringComparer.OrdinalIgnoreCase);

	public ParserRegistry(IEnumerable<IDataParser> allParsers, IServiceProvider sp) : this(sp) {
		foreach (var parser in allParsers) {
			var type = parser.GetType();
			var info = type.GetCustomAttribute<ParserInfoAttribute>();
			if (info != null)
				_parsers[info.Name] = new ParserRegistration(type, info);
		}
	}

	public Type? GetParserType(string name) =>
		_parsers.TryGetValue(name, out var reg) ? reg.ParserType : null;

	public IEnumerable<ParserDescriptorDto> GetAvailableParsers() {
		return _parsers.Values.Select(r =>
			new ParserDescriptorDto(r.Info.Name, r.Info.DisplayName, r.Info.DataType));
	}

	public async Task<ParserDetailsDto?> GetParserDetailsAsync(string name) {
		if (!_parsers.TryGetValue(name, out var reg))
			throw new ParserNotFoundException(name);

		var paramsAttr = reg.ParserType.GetCustomAttributes<ParserParameterAttribute>();
		var parser = sp.GetRequiredService(reg.ParserType) as IDataParser;

		var parameters = new List<ParameterDetailsDto>();
		foreach (var p in paramsAttr) {
			var lookups = await parser.GetParameterLookupsAsync(p.Name);
			parameters.Add(new ParameterDetailsDto(p.Name, p.Description, p.IsRequired, lookups));
		}

		var info = reg.Info;
		return new ParserDetailsDto(info.Name, info.DisplayName, info.Description, info.DataType, parameters);
	}
}