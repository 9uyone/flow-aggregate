using Common.Enums;

namespace Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class ParserInfoAttribute(string name, string displayName, DataType type) : Attribute {
	public string Name { get; } = name;
	public string DisplayName { get; } = displayName;
	public string Description { get; } = string.Empty;
	public DataType DataType { get; } = type;
}
