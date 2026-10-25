using System.Text;

namespace FlowCus.Helpers
{
    public static class JwtConfigurationValidator
    {
        public static bool IsValidKey(string? key)
        {
            if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
                return false;

            return !key.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase)
                && !key.Contains("YOUR_SECRET", StringComparison.OrdinalIgnoreCase)
                && !key.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase);
        }
    }
}
