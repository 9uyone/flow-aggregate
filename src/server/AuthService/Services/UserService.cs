using AuthService.Interfaces;
using AuthService.Models;
using Common.Interfaces;
using Google.Apis.Auth;

namespace AuthService.Services;

public class UserService(IMongoRepository<User> userRepo) : IUserService {
	private async Task CheckAndUpdateUserInfo(User user, GoogleJsonWebSignature.Payload payload) {
		bool updated = false;
		if (user.Email != payload.Email) {
			user.Email = payload.Email;
			updated = true;
		}
		if (user.Name != payload.Name) {
			user.Name = payload.Name;
			updated = true;
		}
		if (user.AvatarUrl != payload.Picture) {
			user.AvatarUrl = payload.Picture;
			updated = true;
		}

		if (updated)
			await userRepo.ReplaceOneAsync(u => u.Id == user.Id, user);
	}

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
		else await CheckAndUpdateUserInfo(user, payload);

		return user;
	}
}