using Common.Exceptions;
using DnsClient.Internal;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler {
	public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception ex, CancellationToken ct) {
		logger.LogError(ex, "Error occured: {Message}", ex.Message);

		var (statusCode, title) = ex switch {
			ParserNotFoundException => (StatusCodes.Status404NotFound, "Parser not found"),
			NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
			ExternalApiException => (StatusCodes.Status503ServiceUnavailable, "External provider error"),
			BadRequestException => (StatusCodes.Status400BadRequest, "Bad request to API"),
			UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized access to API"),
			_ => (StatusCodes.Status500InternalServerError, "Internal server error")
		};

		var problemDetails = new ProblemDetails {
			Status = statusCode,
			Title = title,
			Detail = ex.Message
		};

		context.Response.StatusCode = problemDetails.Status.Value;
		await context.Response.WriteAsJsonAsync(problemDetails, ct);

		return true;
	}
}