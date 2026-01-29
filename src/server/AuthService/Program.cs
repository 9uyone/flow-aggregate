using AuthService.Interfaces;
using AuthService.Models;
using AuthService.Services;
using Common.Config;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddJwtOptions(builder.Configuration);
builder.Services.AddGoogleOptions(builder.Configuration);

// Add services to the container
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<User>("users");
builder.Services.AddAppMongoRepository<RefreshToken>("refresh_tokens");
builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddGlobalExceptionHandler();

builder.Services.AddScoped<IJwtAuthService, JwtAuthService>();
builder.Services.AddScoped<IUserService, UserService>();

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();
app.UseExceptionHandler();

app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/auth/google", async (GoogleTokenRequest request, IUserService userService, IJwtAuthService jwtService) => {
	if (string.IsNullOrEmpty(request.IdToken)) return Results.BadRequest("Token is missing");

	var payload = await jwtService.ValidateGoogleIdTokenAsync(request.IdToken);
	if (payload == null) return Results.Unauthorized();

	var user = await userService.HandleGoogleLoginAsync(payload);
	var result = await jwtService.GenerateAuthResponseAsync(user);

	return Results.Ok(result);
});

app.MapPost("/auth/refresh", async (RefreshRequest request, IJwtAuthService jwtAuthService) => {
	try {
		var result = await jwtAuthService.RotateTokenAsync(request.RefreshToken);
		return Results.Ok(result);
	}
	catch (UnauthorizedException ex) {
		return Results.Unauthorized();
	}
});

app.MapGet("/auth/me", async (ClaimsPrincipal user, IMongoRepository<User> repo) => {
	var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
	var userData = await repo.GetByIdAsync(userId);
	return Results.Ok(new { userData.Id, userData.Email, userData.Name, userData.AvatarUrl });
}).RequireAuthorization();

app.Run();