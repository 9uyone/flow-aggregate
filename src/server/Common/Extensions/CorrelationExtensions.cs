using MassTransit;

namespace Common.Extensions;

public static class CorrelationExtensions {
	/// <summary>
	/// Returns existing ID or generates a new sequential Guid if input is empty.
	/// </summary>
	public static Guid EnsureCorrelationId(this Guid? correlationId)
		=> correlationId == null || correlationId.Value == Guid.Empty
			? NewId.NextGuid()
            : correlationId.Value;

	public static Guid EnsureCorrelationId(this Guid correlationId)
		=> correlationId == Guid.Empty
			? NewId.NextGuid()
			: correlationId;
}
