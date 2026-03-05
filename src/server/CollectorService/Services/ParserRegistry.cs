using CollectorService.Interfaces;
using CollectorService.Contracts;
using Common.Attributes;
using Common.Exceptions;
using Common.Interfaces.Parser;
using System.Reflection;
using Common.Enums;
using CollectorService.Extensions;

namespace CollectorService.Services;

public class ParserRegistry(IServiceProvider sp) : IParserRegistry {
	private sealed record ParserRegistration(Type ParserType, ParserInfoAttribute Info, ParserSourceType SourceType, IEnumerable<string>? MetricFields);

	private readonly Dictionary<string, ParserRegistration> _parsers = new(StringComparer.OrdinalIgnoreCase);

	public ParserRegistry(IEnumerable<IDataParser> allParsers, IServiceProvider sp) : this(sp) {
		foreach (var parser in allParsers) {
			var type = parser.GetType();
			var info = type.GetCustomAttribute<ParserInfoAttribute>();
			if (info == null) continue;

			var source = type.Assembly == typeof(ParserRegistry).Assembly 
				? ParserSourceType.Internal 
				: ParserSourceType.Plugin;

			var metricFields = type.GetCustomAttributes<ParserMetricsAttribute>()
				.SelectMany(a => a.MetricFields)
				.Distinct()
				.ToList();

			_parsers[info.Slug] = new ParserRegistration(type, info, source, metricFields);
		}
	}

	public Type? GetParserType(string slug) =>
		_parsers.TryGetValue(slug, out var reg) ? reg.ParserType : null;

	public IEnumerable<ParserDescriptorDto> GetAvailableParsers() {
		return _parsers.Values.Select(r =>
			new ParserDescriptorDto(r.Info.Slug.ToSlug(), r.Info.DisplayName, r.Info.Description, r.SourceType, r.MetricFields));
	}

	public async Task<ParserDetailsDto?> GetParserDetailsAsync(string slug) {
		if (!_parsers.TryGetValue(slug, out var reg))
			throw new ParserNotFoundException(slug);

		var paramsAttr = reg.ParserType.GetCustomAttributes<ParserParameterAttribute>();
		var parser = sp.GetRequiredService(reg.ParserType) as IDataParser;

		var parameters = new List<ParameterDetailsDto>();
		foreach (var p in paramsAttr) {
			var lookups = await parser.GetParameterLookupsAsync(p.Name);
			parameters.Add(new ParameterDetailsDto(p.Name, p.Description, p.IsRequired, lookups));
		}

		var info = reg.Info;
		return new ParserDetailsDto(info.Slug, info.DisplayName, info.Description, parameters);
	}
}