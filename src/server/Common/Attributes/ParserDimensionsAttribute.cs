namespace Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class ParserDimensionsAttribute(params string[] dimensions) : Attribute {
	public string[] Dimensions { get; } = dimensions;
}