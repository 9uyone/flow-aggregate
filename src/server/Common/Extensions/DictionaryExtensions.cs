namespace Common.Extensions;

public static class DictionaryExtensions {
	public static string GetValueOrDefault(
		this IDictionary<string, string>? parameters,
		string key,
		string defaultValue) {
		if (parameters != null && parameters.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)) {
			return value;
		}
		return defaultValue;
	}

	// Якщо дефолтне значення потребує обчислень (як-от дата)
	public static string GetValueOrCompute(
		this IDictionary<string, string>? parameters,
		string key,
		Func<string> defaultValueFactory) {
		if (parameters != null && parameters.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)) {
			return value;
		}
		return defaultValueFactory();
	}
}