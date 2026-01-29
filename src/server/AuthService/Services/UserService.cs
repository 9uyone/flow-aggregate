using AuthService.Interfaces;
using AuthService.Models;
using Common.Config;
using Common.Interfaces;
using Google.Apis.Auth;

namespace AuthService.Services;

public class UserService(IMongoRepository<User> userRepo) : IUserService {
	public async Task<User> HandleGoogleLoginAsync(GoogleJsonWebSignature.Payload payload) {
		var user = (await userRepo.FindAsync(u => u.GoogleSub == payload.Subject))
			.FirstOrDefault();

		if (user == null) {
			user = new User {
				Email = payload.Email,
				Name = payload.Name,
				GoogleSub = payload.Subject,
				AvatarUrl = payload.Picture
			};
			await userRepo.CreateAsync(user);
		}

		return user;
	}
}
