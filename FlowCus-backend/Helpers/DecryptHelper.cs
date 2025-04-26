using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace FlowCus.Helpers
{
    public static class DecryptHelper
    {
        public static string Decrypt(string encryptedText)
        {
            // Get key from environment variable (throws error if missing)
            string key = Environment.GetEnvironmentVariable("ENCRYPTION_KEY")
                         ?? throw new InvalidOperationException("ENCRYPTION_KEY environment variable is not set");

            byte[] fullCipher = Convert.FromBase64String(encryptedText);
            byte[] iv = fullCipher.Take(16).ToArray();
            byte[] cipherText = fullCipher.Skip(16).ToArray();

            using Aes aes = Aes.Create();
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            Array.Resize(ref keyBytes, 32); // Ensure 256-bit key length

            aes.Key = keyBytes;
            aes.IV = iv;

            using ICryptoTransform decryptor = aes.CreateDecryptor();
            byte[] plainBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
            return Encoding.UTF8.GetString(plainBytes);
        }
    }
}
