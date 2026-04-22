using FlowCus.Controllers;
using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace FlowCus.Services
{
    public class AuthService
    {
        private readonly DBHelper _db;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(DBHelper db, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _db = db;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<LoginResponse?> AuthenticateAsync(string username, string password)
        {
            string sql = "SELECT * FROM userlist WHERE username = @Username AND is_deleted = FALSE LIMIT 1";
            var user = await _db.QuerySingleAsync<User>(sql, new { Username = username });

            if (user == null) return null;

            if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
            {
                _logger.LogWarning($"Login attempt for locked account: {username}");
                return null; // Account is locked
            }

            bool passwordValid = !string.IsNullOrEmpty(user.PasswordHash) && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);

            if (!passwordValid)
            {
                // failed attempt - increment counter
                int maxFailedAttempts = int.Parse(_configuration["AuthSettings:MaxFailedAttempts"] ?? "3");
                int lockoutMinutes = int.Parse(_configuration["AuthSettings:LockoutMinutes"] ?? "2");
                
                int newFailedAttempts = user.FailedAttempts + 1;
                DateTime? newLockoutUntil = null;

                if (newFailedAttempts >= maxFailedAttempts)
                {
                    newLockoutUntil = DateTime.UtcNow.AddMinutes(lockoutMinutes);
                }

                string updateSql = @"
                    UPDATE userlist 
                    SET failed_attempts = @FailedAttempts, 
                        lockout_until = @LockoutUntil 
                    WHERE id = @UserId
                ";
                await _db.ExecuteAsync(updateSql, new
                {
                    UserId = user.Id,
                    FailedAttempts = newFailedAttempts,
                    LockoutUntil = newLockoutUntil
                });

                _logger.LogWarning($"Failed login attempt for user: {username}. Attempts: {newFailedAttempts}");
                return null;
            }

            string resetSql = @"UPDATE userlist SET failed_attempts = 0, lockout_until = NULL,
                                updated_on = now() WHERE id = @UserId";
            await _db.ExecuteAsync(resetSql, new { UserId = user.Id });

            // 5. Generate Session Token (Long-lived JWT)
            return GenerateAuthResponse(user);
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
                // 7-day expiry
                Expires = DateTime.UtcNow.AddDays(7), 
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var accessToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

            return new LoginResponse
            {
                User = new UserDto { Id = user.Id, Username = user.Username, Name = user.Name, IsAdmin = user.IsAdmin }
            };
        }
    }
}