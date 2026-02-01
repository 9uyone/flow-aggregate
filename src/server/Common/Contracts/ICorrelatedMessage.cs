namespace Common.Contracts;

public interface ICorrelatedMessage {
	Guid? CorrelationId { get; set; }
}