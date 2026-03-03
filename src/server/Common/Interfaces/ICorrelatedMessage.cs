namespace Common.Interfaces;

public interface ICorrelatedMessage {
	Guid? CorrelationId { get; set; }
}