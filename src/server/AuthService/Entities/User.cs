using Common.Entities;

namespace AuthService.Entities;

public class User: BaseEntity {
	public string Email { get; set; }
	public string Name { get; set; }
	public string GoogleSub { get; set; } // Google unique identifier
	public string? AvatarUrl { get; set; }
}