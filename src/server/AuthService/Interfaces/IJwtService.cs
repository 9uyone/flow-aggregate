using AuthService.Models;
using Common.Config;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace AuthService.Interfaces;

public interface IJwtService {
	Task<GoogleJsonWebSignature.Payload> ValidateGoogleIdToken(string idToken);
	string GenerateToken(User user);
}
