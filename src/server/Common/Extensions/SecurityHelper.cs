using System.Security.Cryptography;
using System.Text;

namespace Common.Extensions;

public static class SecurityHelper {
	public static string HashToken(string token) {
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
		return Convert.ToHexString(bytes).ToLower();
	}
}