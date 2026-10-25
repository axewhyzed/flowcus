using FlowCus.Helpers;
using Xunit;

namespace FlowCus.Tests
{
    public class SecurityHardeningTests
    {
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("REPLACE_WITH_STRONG_256BIT_KEY_IN_DEPLOYMENT_environment_variable")]
        [InlineData("short")]
        public void JwtKeyValidator_RejectsMissingPlaceholderAndShortKeys(string? key)
        {
            Assert.False(JwtConfigurationValidator.IsValidKey(key));
        }

        [Fact]
        public void JwtKeyValidator_AcceptsConfiguredKeyOfAtLeast32Bytes()
        {
            Assert.True(JwtConfigurationValidator.IsValidKey("a-valid-development-key-with-at-least-32-bytes"));
        }

        [Theory]
        [InlineData("POST")]
        [InlineData("PATCH")]
        [InlineData("PUT")]
        [InlineData("DELETE")]
        public void CsrfProtection_UnsafeMethodsRequireCookieValidation(string method)
        {
            Assert.True(CsrfProtection.IsUnsafeMethod(method));
            Assert.True(CsrfProtection.RequiresTokenValidation(true, null));
            Assert.False(CsrfProtection.RequiresTokenValidation(true, "Bearer abc"));
            Assert.False(CsrfProtection.RequiresTokenValidation(false, null));
        }

        [Fact]
        public void CsrfProtection_RequiresTrustedOriginAndMatchingTokens()
        {
            string[] allowed = ["https://flowcus.example"];
            Assert.True(CsrfProtection.IsTrustedOrigin("https://flowcus.example", allowed));
            Assert.False(CsrfProtection.IsTrustedOrigin("https://attacker.example", allowed));
            Assert.False(CsrfProtection.IsTrustedOrigin("https://flowcus.example.attacker.test", allowed));
            Assert.False(CsrfProtection.IsTrustedOrigin("https://flowcus.example/attacker", allowed));
            Assert.True(CsrfProtection.TokensMatch("token-value", "token-value"));
            Assert.False(CsrfProtection.TokensMatch("token-value", "different"));
            Assert.False(CsrfProtection.TokensMatch(null, "token-value"));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("short")]
        [InlineData("      ")]
        public void PasswordPolicy_RejectsPasswordsBelowMinimum(string? password)
        {
            Assert.False(PasswordPolicy.IsValid(password));
        }

        [Fact]
        public void PasswordPolicy_AcceptsMinimumLengthPassword()
        {
            Assert.True(PasswordPolicy.IsValid("abc123"));
        }

        [Fact]
        public void TimezoneHelper_ConvertsLocalMidnightUsingClientOffset()
        {
            var utcNow = new DateTime(2026, 10, 24, 18, 0, 0, DateTimeKind.Utc);
            var local = TimezoneHelper.ToLocalTime(utcNow, -330);
            var localMidnightUtc = TimezoneHelper.LocalMidnightToUtc(utcNow, -330);

            Assert.Equal(new DateTime(2026, 10, 24, 23, 30, 0), local);
            Assert.Equal(new DateTime(2026, 10, 23, 18, 30, 0, DateTimeKind.Utc), localMidnightUtc);
        }
    }
}
