namespace Common.Exceptions;

public class ParserNotFoundException(string name) : Exception($"Parser '{name}' not found");
public class NotFoundException(string message) : Exception(message);
public class ExternalApiException(string message) : Exception(message);
public class BadRequestException(string message) : Exception(message);
public class ExternalServiceException(string message) : Exception(message);