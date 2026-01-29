using AuthService.Interfaces;
using AuthService.Models;
using Common.Config;
using Common.Exceptions;
using Common.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class JwtAuthService(
	IOptions<JwtOptions> jwtOptions,
	IOptions<GoogleOptions> googleOptions,
	IMongoRepository<User> userRepo,
	IMongoRepository<RefreshToken> rtRepo,
	ILogger<JwtAuthService> logger) : IJwtAuthService {
	public async Task<GoogleJsonWebSignature.Payload> ValidateGoogleIdTokenAsync(string idToken) {
		try {
			var validationSettings = new GoogleJsonWebSignature.ValidationSettings {
				Audience = new List<string> { googleOptions.Value.ClientId }
			};

			return await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);
		}
		catch (Exception ex) {
			logger.LogError("Google token validation failed: {Message}", ex.Message);
			return null;
		}
	}

	private string GenerateAccessToken(string userId, string email, string name, string? avatarUrl) {
		var claims = new[] {
			new Claim(ClaimTypes.NameIdentifier, userId),
			new Claim(ClaimTypes.Email, email),
			new Claim(ClaimTypes.Name, name),
		};

		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Value.Key));
		var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

		var token = new JwtSecurityToken(
			issuer: jwtOptions.Value.Issuer,
			audience: jwtOptions.Value.Audience,
			claims: claims,
			expires: DateTime.UtcNow.AddHours(jwtOptions.Value.AccessTokenLifetimeHours), // Можна через jwtOptions
			signingCredentials: creds
		);

		return new JwtSecurityTokenHandler().WriteToken(token);
	}

	public async Task<AuthResponse> GenerateAuthResponseAsync(User user) {
		var accessToken = GenerateAccessToken(user.Id, user.Email, user.Name, user?.AvatarUrl);
		var refreshToken = Guid.NewGuid().ToString();

		await rtRepo.InsertOneAsync(new RefreshToken {
			UserId = user.Id,
			Token = refreshToken,
			ExpiresAt = DateTime.UtcNow.AddDays(jwtOptions.Value.RefreshTokenLifetimeDays),
			IsUsed = false
		});

		return new AuthResponse(accessToken, refreshToken);
	}

	public async Task<AuthResponse> RotateTokenAsync(string oldRefreshToken) {
		var storedToken = (await rtRepo.FindAsync(x => x.Token == oldRefreshToken)).FirstOrDefault();

		if (storedToken == null || !storedToken.IsActive)
			throw new UnauthorizedException("Invalid refresh token attempt");

		storedToken.IsUsed = true;
		await rtRepo.ReplaceOneAsync(x => x.Id == storedToken.Id, storedToken);

		var user = await userRepo.GetByIdAsync(storedToken.UserId);
		return await GenerateAuthResponseAsync(user);
	}
}