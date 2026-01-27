using Common.Config;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Common.Extensions;

public static class AuthExtensions {
	public static string? GetUserId(this ClaimsPrincipal user) {
		return user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
	}

	public static IServiceCollection AddAppAuthentication(this IServiceCollection services, IConfiguration config) {
		var jwtOptions = config.GetSection("Jwt").Get<JwtOptions>();

		services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(options => {
				options.TokenValidationParameters = new TokenValidationParameters {
					ValidateIssuer = true,

					ValidIssuer = jwtOptions.Issuer,
					ValidateAudience = true,

					ValidAudience = jwtOptions.Audience,
					ValidateLifetime = true,

					ValidateIssuerSigningKey = true,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
				};
			});

		return services;
	}
}