namespace Common.Attributes;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class ParserParameterAttribute(string name, string description, bool isRequired) : Attribute {
	public string Name { get; } = name;
	public string Description { get; } = description;
	public bool IsRequired { get; } = isRequired;
}
