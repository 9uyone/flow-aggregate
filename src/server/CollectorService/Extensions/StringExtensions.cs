namespace CollectorService.Extensions;

public static class StringExtensions {
	public static string ToSlug(this string text) {
		if (string.IsNullOrEmpty(text)) return "";

		// Insert hyphen before uppercase letters
		var withHyphens = string.Concat(text.Select((c, i) => 
			i > 0 && char.IsUpper(c) ? "-" + c : c.ToString()
		));

		return withHyphens.ToLowerInvariant()
			.Replace(" ", "-")
			.Where(c => char.IsLetterOrDigit(c) || c == '-')
			.Aggregate("", (current, c) => current + c)
			.Replace("--", "-")
			.Trim('-');
	}
}