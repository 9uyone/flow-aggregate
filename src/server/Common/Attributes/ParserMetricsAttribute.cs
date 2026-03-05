namespace Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class ParserMetricsAttribute(params string[] fields): Attribute {
	public IEnumerable<string> MetricFields { get; } = fields.ToList();
}