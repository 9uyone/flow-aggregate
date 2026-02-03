using Common.Models;
using MongoDB.Bson.Serialization.Attributes;

namespace AuthService.Models;

public class RefreshToken: BaseEntity {
	public string UserId { get; set; } = null!;
	public string Token { get; set; } = null!;
	public DateTime ExpiresAt { get; set; }
	public bool IsUsed { get; set; }
	public bool IsRevoked { get; set; }

	[BsonIgnore]
	public bool IsActive => !IsRevoked && !IsUsed && DateTime.UtcNow < ExpiresAt;
}
