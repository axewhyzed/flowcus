using System.Security.Cryptography;
using System.Text;

namespace FlowCus.Helpers
{
    public static class CsrfProtection
    {
        public static bool IsUnsafeMethod(string method) =>
            HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);

        public static bool RequiresTokenValidation(bool hasSessionCookie, string? authorizationHeader) =>
            hasSessionCookie && !HasBearerToken(authorizationHeader);

        public static bool HasBearerToken(string? authorizationHeader) =>
            authorizationHeader?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true;

        public static bool IsTrustedOrigin(string? origin, IEnumerable<string> allowedOrigins)
        {
            if (string.IsNullOrWhiteSpace(origin) || !Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;
            if (uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) || !string.IsNullOrEmpty(uri.UserInfo))
                return false;

            string normalized = uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
            return allowedOrigins.Any(allowed => string.Equals(allowed.TrimEnd('/'), normalized, StringComparison.OrdinalIgnoreCase));
        }

        public static bool TokensMatch(string? cookieToken, string? headerToken)
        {
            if (string.IsNullOrEmpty(cookieToken) || string.IsNullOrEmpty(headerToken))
                return false;

            var cookieBytes = Encoding.UTF8.GetBytes(cookieToken);
            var headerBytes = Encoding.UTF8.GetBytes(headerToken);
            return cookieBytes.Length == headerBytes.Length && CryptographicOperations.FixedTimeEquals(cookieBytes, headerBytes);
        }
    }
}
