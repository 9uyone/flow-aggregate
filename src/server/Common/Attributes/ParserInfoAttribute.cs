namespace Common.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class ParserInfoAttribute(string slug, string displayName, string description = "") : Attribute {
	public string Slug { get; } = slug;
	public string DisplayName { get; } = displayName;
	public string Description { get; } = description ?? string.Empty;
}