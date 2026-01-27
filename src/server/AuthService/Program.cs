using AuthService.Interfaces;
using AuthService.Models;
using AuthService.Services;
using Common.Config;
using Common.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddJwtOptions(builder.Configuration);
builder.Services.AddGoogleOptions(builder.Configuration);

// Add services to the container
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddAppMongoRepository<User>("Users");

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserService, UserService>();

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();

app.MapPost("/auth/google", async (GoogleTokenRequest request, IUserService userService, IJwtService jwtService) => {
	if (string.IsNullOrEmpty(request.IdToken)) return Results.BadRequest("Token is missing");

	var payload = await jwtService.ValidateGoogleIdToken(request.IdToken);
	if (payload == null) return Results.Unauthorized();

	var user = await userService.HandleGoogleLoginAsync(payload);

	var token = jwtService.GenerateToken(user);

	return Results.Ok(new { token });
});

app.Run();