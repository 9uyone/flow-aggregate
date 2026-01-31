using AuthService.Interfaces;
using AuthService.Models;
using Common.Config;
using Common.Exceptions;
using Common.Interfaces;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace AuthService;

public static class AuthEndpoints {
	public static void MapAuthEndpoints(this IEndpointRouteBuilder app) {
		var authGroup = app.MapGroup("/auth");

		authGroup.MapPost("/google", async (GoogleTokenRequest request, IUserService userService, IJwtAuthService jwtService) => {
			if (string.IsNullOrEmpty(request.IdToken)) return Results.BadRequest("Token is missing");

			var payload = await jwtService.ValidateGoogleIdTokenAsync(request.IdToken);
			if (payload == null) return Results.Unauthorized();

			var user = await userService.HandleGoogleLoginAsync(payload);
			var result = await jwtService.GenerateAuthResponseAsync(user);

			return Results.Ok(result);
		});

		authGroup.MapPost("/refresh", async (RefreshRequest request, IJwtAuthService jwtAuthService) => {
			try {
				var result = await jwtAuthService.RotateTokenAsync(request.RefreshToken);
				return Results.Ok(result);
			}
			catch (UnauthorizedException ex) {
				return Results.Unauthorized();
			}
		}).RequireAuthorization();

		authGroup.MapGet("/me", async (ClaimsPrincipal user, IMongoRepository<User> repo) => {
			var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
			var userData = await repo.GetByIdAsync(userId);
			return Results.Ok(new { userData.Id, userData.Email, userData.Name, userData.AvatarUrl });
		}).RequireAuthorization();
	}
}