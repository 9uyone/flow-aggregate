using AuthService;
using AuthService.Entities;
using AuthService.Interfaces;
using AuthService.Services;
using Common.Config;
using Common.Constants;
using Common.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.LoadFromEnvFile(builder.Environment);
builder.Services.AddJwtOptions(builder.Configuration);
builder.Services.AddGoogleOptions(builder.Configuration);

// db
builder.Services.AddAppMongo(builder.Configuration);
builder.Services.AddRedisCache(builder.Configuration);
builder.Services.AddCachedMongoRepository<User>(MongoCollections.Users);
//builder.Services.AddAppMongoRepository<User>(MongoCollections.Users);
builder.Services.AddAppMongoRepository<RefreshToken>(MongoCollections.RefreshTokens);

builder.Services.AddAppAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddGlobalExceptionHandler();
builder.Services.AddHealthChecks();

builder.Services.AddScoped<IJwtAuthService, JwtAuthService>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseExceptionHandler();
app.UseHealthChecks("/health");

app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

app.Run();