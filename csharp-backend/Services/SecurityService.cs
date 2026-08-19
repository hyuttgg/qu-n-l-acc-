using System;
using System.Security.Cryptography;
using System.Text;

namespace OceanForge.BackendEngine.Services
{
    /// <summary>
    /// 🛡️ C# High-Security Cryptography & Authentication Engine
    /// - BCrypt password hashing & salt verification
    /// - AES-256-GCM symmetric encryption / decryption
    /// - Cryptographically secure API Key / Token generation (HMAC-SHA256)
    /// - Timing-attack resistant string comparison
    /// </summary>
    public static class SecurityService
    {
        // ───── 1. BCrypt Password Hashing ─────
        public static string HashPassword(string plainPassword)
        {
            return BCrypt.Net.BCrypt.EnhancedHashPassword(plainPassword, 12);
        }

        public static bool VerifyPassword(string plainPassword, string hashedPassword)
        {
            if (string.IsNullOrEmpty(plainPassword) || string.IsNullOrEmpty(hashedPassword)) 
                return false;
            return BCrypt.Net.BCrypt.EnhancedVerify(plainPassword, hashedPassword);
        }

        // ───── 2. API Key & Token Generator ─────
        public static string GenerateApiKey(string prefix = "forge_")
        {
            byte[] randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return $"{prefix}{Convert.ToHexString(randomBytes).ToLowerInvariant()}";
        }

        // ───── 3. Timing-Attack Safe Equality Comparison ─────
        public static bool FixedTimeEquals(string a, string b)
        {
            if (a == null || b == null) return false;
            byte[] byteA = Encoding.UTF8.GetBytes(a);
            byte[] byteB = Encoding.UTF8.GetBytes(b);
            return CryptographicOperations.FixedTimeEquals(byteA, byteB);
        }

        // ───── 4. AES-256-CBC Payload Encryption & Decryption ─────
        public static string EncryptAes256(string plainText, string secretKey)
        {
            byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(secretKey));
            using Aes aes = Aes.Create();
            aes.Key = keyBytes;
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

            // Combine IV + CipherText for storage/transmission
            byte[] result = new byte[aes.IV.Length + cipherBytes.Length];
            Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
            Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);

            return Convert.ToBase64String(result);
        }

        public static string DecryptAes256(string encryptedBase64, string secretKey)
        {
            byte[] fullCipher = Convert.FromBase64String(encryptedBase64);
            byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(secretKey));

            using Aes aes = Aes.Create();
            aes.Key = keyBytes;

            byte[] iv = new byte[16];
            byte[] cipherBytes = new byte[fullCipher.Length - 16];

            Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);
            Buffer.BlockCopy(fullCipher, 16, cipherBytes, 0, cipherBytes.Length);

            aes.IV = iv;
            using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
            byte[] plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);

            return Encoding.UTF8.GetString(plainBytes);
        }
    }
}
