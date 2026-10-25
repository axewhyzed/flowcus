namespace FlowCus.Helpers
{
    public static class PasswordPolicy
    {
        public const int MinimumLength = 6;

        public static bool IsValid(string? password) =>
            !string.IsNullOrWhiteSpace(password) && password.Length >= MinimumLength;
    }
}
