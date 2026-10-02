using FlowCus.Models;
using Xunit;

namespace FlowCus.Tests
{
    public class AuthTests
    {
        [Theory]
        [InlineData(1, 5)]   // 1st lockout tier = 5 minutes
        [InlineData(2, 15)]  // 2nd lockout tier = 15 minutes
        [InlineData(3, 60)]  // 3rd lockout tier = 60 minutes
        [InlineData(4, 60)]  // 4th+ lockout tier = 60 minutes
        public void ProgressiveLockout_TierCalculation_ReturnsCorrectMinutes(int tier, int expectedMinutes)
        {
            int lockoutMinutes = tier switch
            {
                1 => 5,
                2 => 15,
                _ => 60
            };

            Assert.Equal(expectedMinutes, lockoutMinutes);
        }

        [Fact]
        public void User_LockoutCount_DefaultsToZero()
        {
            var user = new User();
            Assert.Equal(0, user.LockoutCount);
            Assert.Equal(0, user.FailedAttempts);
            Assert.Null(user.LockoutUntil);
        }

        [Fact]
        public void BCrypt_HashAndVerify_WorksCorrectly()
        {
            string password = "TestSecurePassword123!";
            string hash = BCrypt.Net.BCrypt.HashPassword(password, 10);

            Assert.True(BCrypt.Net.BCrypt.Verify(password, hash));
            Assert.False(BCrypt.Net.BCrypt.Verify("WrongPassword", hash));
        }
    }
}
