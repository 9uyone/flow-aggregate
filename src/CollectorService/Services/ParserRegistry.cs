using Common.Attributes;
using CollectorService.Interfaces;
using CollectorService.Models;
using Common.Interfaces.Parser;
using System.Reflection;

namespace CollectorService.Services;

public class ParserRegistry(IServiceProvider sp) : IParserRegistry {
	private readonly Dictionary<string, Type> _parsers = new(StringComparer.OrdinalIgnoreCase);

	public ParserRegistry(IEnumerable<IDataParser> allParsers, IServiceProvider sp): this(sp) {
		foreach (var parser in allParsers) {
			var type = parser.GetType();
			var attr = type.GetCustomAttribute<ParserInfoAttribute>();
			if (attr != null)
				_parsers[attr.Name] = type;
		}
	}

	public Type? GetParserType(string name) => _parsers.GetValueOrDefault(name);

	public IEnumerable<ParserDescriptorDto> GetAvailableParsers() {
		return _parsers.Select(p => {
			var info = p.Value.GetCustomAttribute<ParserInfoAttribute>()!;
			return new ParserDescriptorDto(info.Name, info.DisplayName, info.DataType);
		});
	}

	public async Task<ParserDetailsDto?> GetParserDetailsAsync(string name) {
		var parserType = GetParserType(name);
		if (parserType == null) return null;

		var info = parserType.GetCustomAttribute<ParserInfoAttribute>()!;
		var paramsAttr = parserType.GetCustomAttributes<ParserParameterAttribute>();

		var parser = sp.GetRequiredService(parserType) as IDataParser;

		var parameters = new List<ParameterDetailsDto>();
		foreach (var p in paramsAttr) {
			var lookups = await parser.GetParameterLookupsAsync(p.Name);
			parameters.Add(new ParameterDetailsDto(p.Name, p.Description, p.IsRequired, lookups));
		}

		return new ParserDetailsDto(info.Name, info.DisplayName, info.Description, info.DataType, parameters);
	}
}