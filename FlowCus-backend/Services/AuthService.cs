using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace FlowCus.Services
{
    public class AuthResult
    {
        public bool Success { get; set; }
        public bool IsLockedOut { get; set; }
        public int? LockoutMinutesRemaining { get; set; }
        public string? ErrorMessage { get; set; }
        public LoginResponse? Response { get; set; }
    }

    public class AuthService : IAuthService
    {
        private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword("FlowCus-invalid-account-timing-padding", 12);
        private readonly IDbHelper _db;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(IDbHelper db, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _db = db;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AuthResult> AuthenticateAsync(string username, string password)
        {
            string sql = "SELECT * FROM userlist WHERE username = @Username AND is_deleted = FALSE LIMIT 1";
            var user = await _db.QuerySingleAsync<User>(sql, new { Username = username });

            if (user == null)
            {
                _ = BCrypt.Net.BCrypt.Verify(password, DummyPasswordHash);
                return new AuthResult { Success = false, ErrorMessage = "Invalid credentials." };
            }

            if (user.LockoutUntil.HasValue && user.LockoutUntil.Value > DateTime.UtcNow)
            {
                int minutesRemaining = (int)Math.Ceiling((user.LockoutUntil.Value - DateTime.UtcNow).TotalMinutes);
                if (minutesRemaining < 1) minutesRemaining = 1;

                _logger.LogWarning("Login attempt rejected for locked account. UserId={UserId}, RemainingMinutes={Remaining}", user.Id, minutesRemaining);
                return new AuthResult
                {
                    Success = false,
                    IsLockedOut = true,
                    LockoutMinutesRemaining = minutesRemaining,
                    ErrorMessage = "Invalid credentials."
                };
            }

            bool passwordValid = !string.IsNullOrEmpty(user.PasswordHash) && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);

            if (!passwordValid)
            {
                var state = await IncrementFailedAttemptAsync(user.Id);
                _logger.LogWarning("Login rejected. UserId={UserId}, FailedAttempts={FailedAttempts}, Locked={Locked}",
                    user.Id, state.FailedAttempts, state.LockoutUntil.HasValue);
                return new AuthResult
                {
                    Success = false,
                    IsLockedOut = state.LockoutUntil.HasValue,
                    LockoutMinutesRemaining = state.LockoutUntil.HasValue
                        ? Math.Max(1, (int)Math.Ceiling((state.LockoutUntil.Value - DateTime.UtcNow).TotalMinutes))
                        : null,
                    ErrorMessage = "Invalid credentials."
                };
            }

            int? currentTokenVersion = await _db.ExecuteScalarAsync<int?>(@"
                UPDATE userlist
                SET failed_attempts = 0,
                    lockout_until = NULL,
                    lockout_count = 0,
                    updated_on = now()
                WHERE id = @UserId AND is_deleted = FALSE AND password_hash = @PasswordHash
                RETURNING token_version",
                new { UserId = user.Id, PasswordHash = user.PasswordHash });
            if (!currentTokenVersion.HasValue)
                return new AuthResult { Success = false, ErrorMessage = "Invalid credentials." };

            user.TokenVersion = currentTokenVersion.Value;

            return new AuthResult
            {
                Success = true,
                Response = GenerateAuthResponse(user)
            };
        }

        private async Task<FailedLoginState> IncrementFailedAttemptAsync(int userId)
        {
            int threshold = ReadPositiveSetting("AuthSettings:MaxFailedAttempts", 3, 10);
            int firstLockoutMinutes = ReadPositiveSetting("AuthSettings:FirstLockoutMinutes", 5, 1440);
            int secondLockoutMinutes = ReadPositiveSetting("AuthSettings:SecondLockoutMinutes", 15, 1440);
            int maxLockoutMinutes = ReadPositiveSetting("AuthSettings:MaxLockoutMinutes", 60, 10080);

            const string sql = @"
                WITH locked_user AS MATERIALIZED (
                    SELECT id, failed_attempts, lockout_count,
                           lockout_until IS NOT NULL AND lockout_until <= now() AS lockout_expired,
                           lockout_until IS NOT NULL AND lockout_until > now() AS lockout_active
                    FROM userlist
                    WHERE id = @UserId AND is_deleted = FALSE
                    FOR UPDATE
                ), next_state AS (
                    SELECT id,
                           CASE WHEN lockout_expired THEN 1 ELSE failed_attempts + 1 END AS next_failed_attempts,
                           lockout_count,
                           lockout_active
                    FROM locked_user
                ), tiered AS (
                    SELECT id, next_failed_attempts, lockout_active,
                           CASE WHEN next_failed_attempts >= @Threshold THEN lockout_count + 1 ELSE lockout_count END AS next_lockout_count
                    FROM next_state
                ), changed AS (
                    UPDATE userlist AS u
                    SET failed_attempts = CASE WHEN t.next_failed_attempts >= @Threshold THEN 0 ELSE t.next_failed_attempts END,
                        lockout_count = t.next_lockout_count,
                        lockout_until = CASE WHEN t.next_failed_attempts >= @Threshold THEN
                            now() + make_interval(mins => CASE
                                WHEN t.next_lockout_count = 1 THEN @FirstLockoutMinutes
                                WHEN t.next_lockout_count = 2 THEN @SecondLockoutMinutes
                                ELSE @MaxLockoutMinutes END)
                            ELSE NULL END,
                        updated_on = now()
                    FROM tiered t
                    WHERE u.id = t.id AND NOT t.lockout_active
                    RETURNING u.failed_attempts, u.lockout_until
                )
                SELECT failed_attempts AS FailedAttempts, lockout_until AS LockoutUntil FROM changed
                UNION ALL
                SELECT failed_attempts AS FailedAttempts, lockout_until AS LockoutUntil
                FROM locked_user WHERE lockout_active;";

            var state = await _db.QuerySingleAsync<FailedLoginState>(sql, new
            {
                UserId = userId,
                Threshold = threshold,
                FirstLockoutMinutes = firstLockoutMinutes,
                SecondLockoutMinutes = secondLockoutMinutes,
                MaxLockoutMinutes = maxLockoutMinutes
            });
            if (state != null) return state;

            return await _db.QuerySingleAsync<FailedLoginState>(@"
                SELECT failed_attempts AS FailedAttempts, lockout_until AS LockoutUntil
                FROM userlist WHERE id = @UserId AND is_deleted = FALSE",
                new { UserId = userId }) ?? new FailedLoginState();
        }

        private int ReadPositiveSetting(string key, int fallback, int maximum)
        {
            return int.TryParse(_configuration[key], out var value) && value > 0
                ? Math.Min(value, maximum)
                : fallback;
        }

        private sealed class FailedLoginState
        {
            public int FailedAttempts { get; set; }
            public DateTime? LockoutUntil { get; set; }
        }

        private LoginResponse GenerateAuthResponse(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),
                new Claim("token_version", user.TokenVersion.ToString(System.Globalization.CultureInfo.InvariantCulture))
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7), // 7-day expiry
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var accessToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

            return new LoginResponse
            {
                Token = accessToken,
                User = new UserDto { Id = user.Id, Username = user.Username, Name = user.Name, IsAdmin = user.IsAdmin }
            };
        }
    }
}
