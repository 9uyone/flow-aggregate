using MassTransit;

namespace Common.Extensions;

public static class CorrelationExtensions {
	/// <summary>
	/// Returns existing ID or generates a new sequential Guid if input is empty.
	/// </summary>
	public static Guid EnsureCorrelationId(this Guid? correlationId)
		=> correlationId == null || correlationId.Value == Guid.Empty
			? GenCorrelationId()
			: correlationId.Value;

	public static Guid EnsureCorrelationId(this Guid correlationId)
		=> correlationId == Guid.Empty
			? GenCorrelationId()
			: correlationId;

	extension(Guid) {
		public static Guid GenCorrelationId() => NewId.NextGuid();
	}
}