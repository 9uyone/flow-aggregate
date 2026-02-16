using Common.Entities;
using MongoDB.Bson.Serialization.Attributes;

namespace AuthService.Entities;

public class RefreshToken: BaseEntity {
	public Guid UserId { get; set; }
	public string Token { get; set; } = null!;
	public DateTime ExpiresAt { get; set; }
	public bool IsUsed { get; set; }
	public bool IsRevoked { get; set; }

	[BsonIgnore]
	public bool IsActive => !IsRevoked && !IsUsed && DateTime.UtcNow < ExpiresAt;
}
