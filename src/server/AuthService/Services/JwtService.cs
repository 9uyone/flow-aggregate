using AuthService.Interfaces;
using AuthService.Models;
using Common.Config;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class JwtService(
	IOptions<JwtOptions> jwtOptions,
	IOptions<GoogleOptions> googleOptions,
	ILogger<JwtService> logger) : IJwtService {
	public async Task<GoogleJsonWebSignature.Payload> ValidateGoogleIdToken(string idToken) {
		try {
			var validationSettings = new GoogleJsonWebSignature.ValidationSettings {
				Audience = new List<string> { googleOptions.Value.ClientId }
			};

			return await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);
		}
		catch (Exception ex) {
			logger.LogError("Google Token Validation Failed: {Message}", ex.Message);
			return null;
		}
	}

	public string GenerateToken(User user) {
		var claims = new[] {
			new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
			new Claim(ClaimTypes.Email, user.Email),
			new Claim(ClaimTypes.Name, user.Name),
		};

		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Value.Key));
		var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

		var token = new JwtSecurityToken(
			issuer: jwtOptions.Value.Issuer,
			audience: jwtOptions.Value.Audience,
			claims: claims,
			expires: DateTime.UtcNow.AddHours(jwtOptions.Value.LifetimeHours),
			signingCredentials: creds
		);

		return new JwtSecurityTokenHandler().WriteToken(token);
	}
}