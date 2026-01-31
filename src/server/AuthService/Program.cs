using AuthService;
using AuthService.Interfaces;
using AuthService.Models;
using AuthService.Services;
using Common.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddJwtOptions(builder.Configuration);
builder.Services.AddGoogleOptions(builder.Configuration);

// db
builder.Services.AddAppMongo(builder.Configuration);
//builder.Services.AddAppMongoRepository<User>("users");
builder.Services.AddRedisCache(builder.Configuration);
builder.Services.AddCachedMongoRepository<User>("users");
builder.Services.AddAppMongoRepository<RefreshToken>("refresh_tokens");

builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddGlobalExceptionHandler();

builder.Services.AddScoped<IJwtAuthService, JwtAuthService>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();
app.UseExceptionHandler();

app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

app.Run();