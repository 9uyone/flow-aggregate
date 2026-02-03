namespace AuthService.Contracts;

public record AuthResponse(string AccessToken, string RefreshToken);