using FlowCus.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IMemoryCache _cache;

        private readonly int _maxFailedAttempts;
        private readonly TimeSpan _lockoutDuration;
        private readonly int _ipRateLimitPerMinute;
        private readonly int _userRateLimitPerMinute;
        private readonly int _bcryptWorkFactor;

        public AuthController(DBHelper dbHelper, IConfiguration configuration, ILogger<AuthController> logger, IMemoryCache cache)
        {
            _dbHelper = dbHelper;
            _configuration = configuration;
            _logger = logger;
            _cache = cache;

            // constructor body (after _cache = cache;)
            _maxFailedAttempts = int.Parse(_configuration["AuthSettings:MaxFailedAttempts"] ?? "3");
            _ipRateLimitPerMinute = int.Parse(_configuration["AuthSettings:IpRateLimitPerMinute"] ?? "30");
            _userRateLimitPerMinute = int.Parse(_configuration["AuthSettings:UserRateLimitPerMinute"] ?? "10");
            var lockoutMins = int.Parse(_configuration["AuthSettings:LockoutMinutes"] ?? "2");
            _lockoutDuration = TimeSpan.FromMinutes(lockoutMins);
            _bcryptWorkFactor = int.Parse(_configuration["AuthSettings:BcryptWorkFactor"] ?? "12");
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new ErrorResponse { Error = "Username and password are required." });

            string username = request.Username.Trim();
            string ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            if (IsRateLimited($"ip:{ip}", _ipRateLimitPerMinute))
            {
                Response.Headers["Retry-After"] = "60"; // seconds; or compute remaining window dynamically if you prefer
                return StatusCode(429, new ErrorResponse { Error = "Too many requests from this IP. Try again later." });
            }

            if (IsRateLimited($"user:{username}", _userRateLimitPerMinute))
            {
                Response.Headers["Retry-After"] = "60";
                return StatusCode(429, new ErrorResponse { Error = "Too many attempts for this user. Try again later." });
            }

            try
            {
                string query = @"
                    SELECT id, username, password_hash, name, failed_attempts, lockout_until
                    FROM userlist
                    WHERE username = @username
                    LIMIT 1";
                var param = new NpgsqlParameter("@username", username);
                DataTable dt = await _dbHelper.GetTableAsync(query, param);

                if (dt.Rows.Count == 0)
                {
                    _logger.LogWarning("Login failed: username not found ({User})", username);
                    // Keep response identical for not-found vs wrong-password
                    IncrementRateCounters(username, ip);
                    return Unauthorized(new ErrorResponse { Error = "Invalid credentials." });
                }

                var row = dt.Rows[0];
                int userId = Convert.ToInt32(row["id"]);
                string stored = row["password_hash"] == DBNull.Value ? string.Empty : row["password_hash"].ToString();
                int failedAttempts = row.Table.Columns.Contains("failed_attempts") && row["failed_attempts"] != DBNull.Value
                                     ? Convert.ToInt32(row["failed_attempts"]) : 0;
                DateTime? lockoutUntil = row.Table.Columns.Contains("lockout_until") && row["lockout_until"] != DBNull.Value
                                         ? (DateTime?)Convert.ToDateTime(row["lockout_until"]) : null;

                // Check lockout
                if (lockoutUntil.HasValue && lockoutUntil.Value > DateTime.UtcNow)
                {
                    _logger.LogWarning("Login blocked: user {UserId} locked until {Lockout}", userId, lockoutUntil);
                    return Unauthorized(new ErrorResponse { Error = $"Too many attempts. Try again at {lockoutUntil.Value:u} UTC." });
                }

                bool passwordVerified = false;
                bool migratedToBcrypt = false;

                if (!string.IsNullOrEmpty(stored))
                {
                    // If stored looks like bcrypt hash (starts with $2a/$2b/$2y...), verify with BCrypt
                    if (stored.StartsWith("$2"))
                    {
                        passwordVerified = BCrypt.Net.BCrypt.Verify(request.Password, stored);
                    }
                    else
                    {
                        // Legacy reversible encrypted password: decrypt then compare
                        string decrypted;
                        try
                        {
                            decrypted = CryptoHelper.Decrypt(stored, _logger);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error decrypting legacy password for user {User}", username);
                            return StatusCode(500, new ErrorResponse { Error = "Internal server error occurred." });
                        }

                        if (decrypted == request.Password)
                        {
                            passwordVerified = true;
                            // Migrate: hash with bcrypt and store
                            string bcryptHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
                            string updateSql = "UPDATE userlist SET password_hash = @ph, password = NULL, updated_on = now() WHERE id = @id";
                            var p1 = new NpgsqlParameter("@ph", bcryptHash);
                            var p2 = new NpgsqlParameter("@id", userId);
                            await _dbHelper.ExecuteQueryAsync(updateSql, p1, p2);
                            migratedToBcrypt = true;
                            _logger.LogInformation("Migrated user {UserId} to bcrypt password hashing.", userId);
                        }
                    }
                }

                if (!passwordVerified)
                {
                    // increment failed attempts and maybe lock out
                    failedAttempts++;
                    var updateParams = new List<NpgsqlParameter>
                    {
                        new NpgsqlParameter("@fa", failedAttempts),
                        new NpgsqlParameter("@id", userId)
                    };

                    string updateSql;
                    if (failedAttempts >= _maxFailedAttempts)
                    {
                        DateTime until = DateTime.UtcNow.Add(_lockoutDuration);
                        updateSql = "UPDATE userlist SET failed_attempts = @fa, lockout_until = @lock, updated_on = now() WHERE id = @id";
                        updateParams.Add(new NpgsqlParameter("@lock", until));
                    }
                    else
                    {
                        updateSql = "UPDATE userlist SET failed_attempts = @fa, updated_on = now() WHERE id = @id";
                    }

                    await _dbHelper.ExecuteQueryAsync(updateSql, updateParams.ToArray());
                    IncrementRateCounters(username, ip);

                    _logger.LogWarning("Login failed: incorrect password for userId {UserId}. Attempts={Attempts}", userId, failedAttempts);
                    return Unauthorized(new ErrorResponse { Error = "Invalid credentials." });
                }

                // Success path: reset failed attempts & lockout
                string resetSql = "UPDATE userlist SET failed_attempts = 0, lockout_until = NULL, updated_on = now() WHERE id = @id";
                await _dbHelper.ExecuteQueryAsync(resetSql, new NpgsqlParameter("@id", userId));

                // Generate JWT
                string token = GenerateJwtToken(userId, username);

                var userDto = new UserDto { Id = userId, Username = username, Name = row.Table.Columns.Contains("name") ? row["name"]?.ToString() : null };

                _logger.LogInformation("User {UserId} logged in successfully (migratedToBcrypt={Migrated})", userId, migratedToBcrypt);

                return Ok(new AuthResponse { Token = token, User = userDto });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for user {User}", request?.Username);
                return StatusCode(500, new ErrorResponse { Error = "Internal server error occurred." });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value;
                _logger.LogInformation("User {Username} (ID: {UserId}) logged out", username, userId);

                // Note: JWT is stateless — this just acknowledges logout. To truly revoke tokens, maintain a blacklist.

                return Ok(new { message = "Logged out successfully", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new ErrorResponse { Error = "Internal server error occurred." });
            }
        }

        // Register: store bcrypt hash (no reversible encryption)
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new ErrorResponse { Error = "Username and password are required." });

            if (request.Password.Length < 6)
                return BadRequest(new ErrorResponse { Error = "Password must be at least 6 characters." });

            string username = request.Username.Trim();

            try
            {
                string bcryptHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
                string sql = @"
                    INSERT INTO userlist (username, password_hash, name, created_on)
                    VALUES (@username, @ph, @name, now())
                    RETURNING id;
                ";
                var p1 = new NpgsqlParameter("@username", username);
                var p2 = new NpgsqlParameter("@ph", bcryptHash);
                var p3 = new NpgsqlParameter("@name", (object?)request.Name ?? DBNull.Value);

                object? res = await _dbHelper.GetValueAsync(sql, p1, p2, p3);
                if (res == null)
                {
                    _logger.LogError("Register: INSERT returned null for user {User}", username);
                    return StatusCode(500, new ErrorResponse { Error = "Could not create user." });
                }

                int newUserId = Convert.ToInt32(res);
                string token = GenerateJwtToken(newUserId, username);

                _logger.LogInformation("User {User} registered with id {Id}", username, newUserId);

                return Ok(new AuthResponse { Token = token, User = new UserDto { Id = newUserId, Username = username, Name = request.Name } });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                _logger.LogWarning("Register attempt with existing username {User}", username);
                return Conflict(new ErrorResponse { Error = "Username already exists." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration for user {User}", username);
                return StatusCode(500, new ErrorResponse { Error = "Internal server error occurred." });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new ErrorResponse { Error = "Current and new passwords are required." });

            if (request.NewPassword.Length < 6)
                return BadRequest(new ErrorResponse { Error = "New password must be at least 6 characters." });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new ErrorResponse { Error = "Invalid user." });

            try
            {
                string sql = "SELECT COALESCE(password, password_hash) AS enc_pass FROM userlist WHERE id = @id LIMIT 1";
                var p = new NpgsqlParameter("@id", userId);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                if (dt.Rows.Count == 0)
                {
                    _logger.LogWarning("ChangePassword: user id {UserId} not found", userId);
                    return NotFound(new ErrorResponse { Error = "User not found." });
                }

                var encObj = dt.Rows[0]["enc_pass"];
                string stored = encObj == DBNull.Value || encObj == null ? string.Empty : encObj.ToString();
                bool verified = false;

                if (!string.IsNullOrEmpty(stored))
                {
                    if (stored.StartsWith("$2"))
                    {
                        verified = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, stored);
                    }
                    else
                    {
                        string decrypted;
                        try
                        {
                            decrypted = CryptoHelper.Decrypt(stored, _logger);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "ChangePassword: decryption failed for user {UserId}", userId);
                            return StatusCode(500, new ErrorResponse { Error = "Internal server error." });
                        }
                        verified = decrypted == request.CurrentPassword;
                    }
                }

                if (!verified)
                {
                    _logger.LogWarning("ChangePassword: incorrect current password for user {UserId}", userId);
                    return Unauthorized(new ErrorResponse { Error = "Current password is incorrect." });
                }

                // Hash new password with bcrypt and update DB (also clear legacy password column)
                string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, _bcryptWorkFactor);
                string updateSql = "UPDATE userlist SET password_hash = @ph, password = NULL, updated_on = now() WHERE id = @id";
                var p1 = new NpgsqlParameter("@ph", newHash);
                var p2 = new NpgsqlParameter("@id", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(updateSql, p1, p2);
                if (rows == 1)
                {
                    _logger.LogInformation("ChangePassword: user {UserId} changed password successfully", userId);
                    return Ok(new { message = "Password changed successfully." });
                }
                else
                {
                    _logger.LogError("ChangePassword: update affected {Rows} rows for user {UserId}", rows, userId);
                    return StatusCode(500, new ErrorResponse { Error = "Failed to update password." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ChangePassword: unexpected error for user {UserId}", userId);
                return StatusCode(500, new ErrorResponse { Error = "Internal server error occurred." });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (!int.TryParse(idClaim, out int userId))
                return Unauthorized(new ErrorResponse { Error = "Invalid token." });

            try
            {
                string sql = "SELECT username, name FROM userlist WHERE id = @id LIMIT 1";
                var p = new NpgsqlParameter("@id", userId);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                if (dt.Rows.Count == 0)
                    return NotFound(new ErrorResponse { Error = "User not found." });

                var row = dt.Rows[0];
                var userDto = new UserDto
                {
                    Id = userId,
                    Username = row["username"]?.ToString() ?? "",
                    Name = row["name"]?.ToString()
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Me: error fetching user profile for user {UserId}", userId);
                return StatusCode(500, new ErrorResponse { Error = "Internal server error." });
            }
        }

        // ----------------- helpers ----------------

        private string GenerateJwtToken(int userId, string username)
        {
            var keyString = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key configuration missing");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7), // per your choice: long-lived
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // Increment a simple in-memory counter for IP/user to enforce rate limits & brute force
        private void IncrementRateCounters(string username, string ip)
        {
            // increments are handled by IsRateLimited (which increases counts)
            _ = IsRateLimited($"ip:{ip}", _ipRateLimitPerMinute, incrementOnly: true);
            _ = IsRateLimited($"user:{username}", _userRateLimitPerMinute, incrementOnly: true);
        }

        // Returns true if key is currently rate-limited. When incrementOnly=true, increases count but doesn't enforce expiry logic
        private bool IsRateLimited(string key, int limitPerMinute, bool incrementOnly = false)
        {
            var now = DateTime.UtcNow;
            string cacheKey = $"ratelimit:{key}";

            var entry = _cache.GetOrCreate(cacheKey, ce =>
            {
                ce.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return new RateLimitBucket { Count = 0, WindowStart = now };
            });

            if (incrementOnly)
            {
                entry.Count++;
                _cache.Set(cacheKey, entry, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) });
                return entry.Count > limitPerMinute;
            }
            else
            {
                return entry.Count >= limitPerMinute;
            }
        }

        private class RateLimitBucket
        {
            public int Count { get; set; }
            public DateTime WindowStart { get; set; }
        }
    }


    public class LoginRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string? Name { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }

    public class AuthResponse
    {
        public string Token { get; set; } = "";
        public UserDto User { get; set; } = new UserDto();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = "";
        public string? Name { get; set; }
    }

    public class ErrorResponse
    {
        public string Error { get; set; } = "";
    }
}
