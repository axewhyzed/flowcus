using FlowCus.Controllers;
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
                return new AuthResult { Success = false, ErrorMessage = "Invalid credentials." };
            }

            // Check if currently locked out
            if (user.LockoutUntil.HasValue && user.LockoutUntil.Value > DateTime.UtcNow)
            {
                int minutesRemaining = (int)Math.Ceiling((user.LockoutUntil.Value - DateTime.UtcNow).TotalMinutes);
                if (minutesRemaining < 1) minutesRemaining = 1;

                _logger.LogWarning("Login attempt for locked account: {Username}. Remaining: {Remaining} min", username, minutesRemaining);
                return new AuthResult
                {
                    Success = false,
                    IsLockedOut = true,
                    LockoutMinutesRemaining = minutesRemaining,
                    ErrorMessage = $"Account is temporarily locked due to multiple failed login attempts. Please try again in {minutesRemaining} minute{(minutesRemaining == 1 ? "" : "s")}."
                };
            }

            // If a previous lockout period has expired, start a fresh 3-attempt cycle for this tier
            int currentFailed = (user.LockoutUntil.HasValue && user.LockoutUntil.Value <= DateTime.UtcNow) ? 0 : user.FailedAttempts;

            bool passwordValid = !string.IsNullOrEmpty(user.PasswordHash) && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);

            if (!passwordValid)
            {
                int newFailedAttempts = currentFailed + 1;

                // 3 failed attempts triggers progressive lockout: 1st time 5m, 2nd time 15m, 3rd+ times 60m
                if (newFailedAttempts >= 3)
                {
                    int newLockoutCount = user.LockoutCount + 1;
                    int lockoutMinutes = newLockoutCount switch
                    {
                        1 => 5,
                        2 => 15,
                        _ => 60
                    };

                    DateTime newLockoutUntil = DateTime.UtcNow.AddMinutes(lockoutMinutes);

                    string lockoutSql = @"
                        UPDATE userlist 
                        SET failed_attempts = 0, 
                            lockout_until = @LockoutUntil,
                            lockout_count = @LockoutCount,
                            updated_on = now()
                        WHERE id = @UserId";

                    await _db.ExecuteAsync(lockoutSql, new
                    {
                        UserId = user.Id,
                        LockoutUntil = newLockoutUntil,
                        LockoutCount = newLockoutCount
                    });

                    _logger.LogWarning("User {Username} locked out. Tier: {Tier}, Duration: {Minutes} min", username, newLockoutCount, lockoutMinutes);

                    return new AuthResult
                    {
                        Success = false,
                        IsLockedOut = true,
                        LockoutMinutesRemaining = lockoutMinutes,
                        ErrorMessage = $"Account is temporarily locked due to multiple failed login attempts. Please try again in {lockoutMinutes} minutes."
                    };
                }
                else
                {
                    string updateSql = @"
                        UPDATE userlist 
                        SET failed_attempts = @FailedAttempts, 
                            lockout_until = NULL,
                            updated_on = now()
                        WHERE id = @UserId";

                    await _db.ExecuteAsync(updateSql, new
                    {
                        UserId = user.Id,
                        FailedAttempts = newFailedAttempts
                    });

                    int attemptsRemaining = 3 - newFailedAttempts;
                    _logger.LogWarning("Failed login attempt for user: {Username}. Attempts: {Attempts}/3", username, newFailedAttempts);

                    return new AuthResult
                    {
                        Success = false,
                        ErrorMessage = $"Invalid credentials. You have {attemptsRemaining} attempt{(attemptsRemaining == 1 ? "" : "s")} remaining before lockout."
                    };
                }
            }

            // Successful login: reset failed attempts, lockout window, and lockout tier count completely
            string resetSql = @"UPDATE userlist 
                                SET failed_attempts = 0, 
                                    lockout_until = NULL, 
                                    lockout_count = 0,
                                    updated_on = now() 
                                WHERE id = @UserId";
            await _db.ExecuteAsync(resetSql, new { UserId = user.Id });

            return new AuthResult
            {
                Success = true,
                Response = GenerateAuthResponse(user)
            };
        }

        private LoginResponse GenerateAuthResponse(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User")
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