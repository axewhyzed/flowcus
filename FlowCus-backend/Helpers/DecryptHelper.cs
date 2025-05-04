using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace FlowCus.Helpers
{
    /// <summary>
    /// Provides AES-256 decryption functionality using an environment-sourced encryption key.
    /// </summary>
    public static class DecryptHelper
    {
        /// <summary>
        /// Decrypts a base64-encoded ciphertext using AES-256-CBC.
        /// </summary>
        /// <param name="encryptedText">Encrypted text in base64 format (IV + ciphertext).</param>
        /// <param name="logger">Logger instance for operational tracking.</param>
        /// <returns>Decrypted plaintext.</returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown for missing key, invalid input, or decryption failure.
        /// </exception>
        public static string Decrypt(string encryptedText, ILogger logger)
        {
            logger.LogDebug("Starting decryption process.");

            // Get key from environment variable
            string key = Environment.GetEnvironmentVariable("ENCRYPTION_KEY")
                ?? throw new InvalidOperationException("ENCRYPTION_KEY environment variable not found");
            logger.LogTrace("Encryption key retrieved.");

            try
            {
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

                // Prepare AES key (normalize to 32 bytes)
                byte[] keyBytes = Encoding.UTF8.GetBytes(key);
                if (keyBytes.Length != 32)
                {
                    logger.LogWarning("Key length was {Length}, resizing to 32 bytes for AES-256.", keyBytes.Length);
                    Array.Resize(ref keyBytes, 32);
                }

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
    }
}
