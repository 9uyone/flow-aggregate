using Common.Models;

namespace AuthService.Models;

public class RefreshToken: BaseEntity {
	public string UserId { get; set; } = null!;
	public string Token { get; set; } = null!;
	public DateTime ExpiresAt { get; set; }
	public bool IsUsed { get; set; }
	public bool IsRevoked { get; set; }

	public bool IsActive => !IsRevoked && !IsUsed && DateTime.UtcNow < ExpiresAt;
}
