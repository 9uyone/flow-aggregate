using Common.Config;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Common.Extensions;

public static class AuthExtensions {
	public static Guid GetUserId(this ClaimsPrincipal user) {
		if (user?.Identity?.IsAuthenticated != true)
			throw new UnauthorizedAccessException("User is not authenticated");

		var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

		if (string.IsNullOrEmpty(userIdClaim))
			throw new UnauthorizedAccessException("User ID claim not found in token");

		if (!Guid.TryParse(userIdClaim, out Guid userId))
			throw new UnauthorizedAccessException("Cannot parse UserId");

		return userId;
	}

	public static IServiceCollection AddAppAuthentication(this IServiceCollection services, IConfiguration config) {
		var jwtOptions = config.GetSection("Jwt").Get<JwtOptions>();

		services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(options => {
				options.TokenValidationParameters = new TokenValidationParameters {
					ValidateLifetime = true,
					ClockSkew = TimeSpan.Zero,

					ValidateIssuer = true,
					ValidIssuer = jwtOptions.Issuer,

					ValidateAudience = true,
					ValidAudience = jwtOptions.Audience,

					ValidateIssuerSigningKey = true,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
				};
			});

		return services;
	}
}