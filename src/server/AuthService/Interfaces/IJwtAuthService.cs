using AuthService.Contracts;
using AuthService.Models;
using Google.Apis.Auth;

namespace AuthService.Interfaces;

public interface IJwtAuthService {
	Task<GoogleJsonWebSignature.Payload> ValidateGoogleIdTokenAsync(string idToken);
	Task<AuthResponse> GenerateAuthResponseAsync(User user);
	Task<AuthResponse> RotateTokenAsync(string oldRefreshToken);
}
