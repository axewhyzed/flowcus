using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace FlowCus.Helpers
{
    /// <summary>
    /// Provides AES-256 decryption functionality using an environment-sourced encryption key.
    /// </summary>
    public static class CryptoHelper
    {
        public static string Decrypt(string encryptedText, ILogger logger)
        {
            logger.LogDebug("Starting decryption process.");

            try
            {
                var keyBytes = GetNormalizedKey(logger);

                // Split IV and ciphertext
                byte[] fullCipher = Convert.FromBase64String(encryptedText);
                if (fullCipher.Length < 16)
                {
                    logger.LogError("Invalid ciphertext (too short for IV).");
                    throw new ArgumentException("Invalid encrypted text format.");
                }

                byte[] iv = fullCipher.Take(16).ToArray();
                byte[] cipherText = fullCipher.Skip(16).ToArray();
                logger.LogTrace("IV and ciphertext separated.");

                // Configure AES
                using var aes = Aes.Create();
                aes.Key = keyBytes;
                aes.IV = iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                logger.LogDebug("AES configured for decryption.");

                // Decrypt
                using var decryptor = aes.CreateDecryptor();
                byte[] plainBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
                logger.LogInformation("Decryption successful. Decrypted byte length: {Length}", plainBytes.Length);

                return Encoding.UTF8.GetString(plainBytes);
            }
            catch (FormatException ex)
            {
                logger?.LogError(ex, "Cipher text is not valid Base64.");
                throw new ArgumentException("Invalid encrypted text format (Base64).", ex);
            }
            catch (CryptographicException ex)
            {
                logger.LogCritical(ex, "Cryptographic error during decryption. Check key and input format.");
                throw new InvalidOperationException("Decryption failed due to a cryptographic error.", ex);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "General error during decryption.");
                throw;
            }
        }

        public static string Encrypt(string plainText, ILogger logger = null)
        {
            logger?.LogDebug("Starting encryption process.");
            try
            {
                var keyBytes = GetNormalizedKey(logger);

                using var aes = Aes.Create();
                aes.Key = keyBytes;
                aes.GenerateIV();
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                logger?.LogTrace("AES configured for encryption. IV length: {IvLen} bytes.", aes.IV.Length);

                using var encryptor = aes.CreateEncryptor();
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText ?? string.Empty);
                byte[] cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
                logger?.LogInformation("Encryption successful. Input bytes: {InLen}, Cipher bytes: {OutLen}.",
                                       plainBytes.Length, cipherBytes.Length);

                byte[] fullCipher = new byte[aes.IV.Length + cipherBytes.Length];
                Buffer.BlockCopy(aes.IV, 0, fullCipher, 0, aes.IV.Length);
                Buffer.BlockCopy(cipherBytes, 0, fullCipher, aes.IV.Length, cipherBytes.Length);

                return Convert.ToBase64String(fullCipher);
            }
            catch (CryptographicException ex)
            {
                logger?.LogCritical(ex, "Cryptographic error during encryption.");
                throw new InvalidOperationException("Encryption failed due to a cryptographic error.", ex);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "General error during encryption.");
                throw;
            }
        }

        private static byte[] GetNormalizedKey(ILogger logger)
        {
            string key = Environment.GetEnvironmentVariable("ENCRYPTION_KEY")
                ?? throw new InvalidOperationException("ENCRYPTION_KEY environment variable not found");

            if (key.Length < 16)
            {
                throw new InvalidOperationException("ENCRYPTION_KEY must be at least 16 characters long for security.");
            }

            // SECURITY FIX: Use PBKDF2 to derive a proper 32-byte key from any length password
            // This prevents weak key space from short or improperly-padded keys
            using (var pbkdf2 = new System.Security.Cryptography.Rfc2898DeriveBytes(key, Encoding.UTF8.GetBytes("FlowCusSalt"), 10000, System.Security.Cryptography.HashAlgorithmName.SHA256))
            {
                return pbkdf2.GetBytes(32); // Return 32 bytes for AES-256
            }
        }
    }
}
