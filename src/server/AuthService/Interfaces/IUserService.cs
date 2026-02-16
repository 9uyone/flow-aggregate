using AuthService.Entities;
using Google.Apis.Auth;

namespace AuthService.Interfaces;

public interface IUserService {
	Task<User> HandleGoogleLoginAsync(GoogleJsonWebSignature.Payload payload);
}
