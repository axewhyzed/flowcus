using System.Text.RegularExpressions;

namespace FlowCus.Helpers
{
    public static partial class IdempotencyKeyValidator
    {
        [GeneratedRegex("^[A-Za-z0-9._:-]{1,100}$", RegexOptions.CultureInvariant)]
        private static partial Regex KeyPattern();

        public static bool IsValid(string key) => KeyPattern().IsMatch(key);
    }
}
