using FlowCus.Helpers;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using BCrypt.Net;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly DBHelper _dbHelper; // Kept for Register/ChangePassword/Me
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IMemoryCache _cache;

        private readonly int _ipRateLimitPerMinute;
        private readonly int _userRateLimitPerMinute;
        private readonly int _bcryptWorkFactor;

        public AuthController(AuthService authService, DBHelper dbHelper, IConfiguration configuration, ILogger<AuthController> logger, IMemoryCache cache)
        {
            _authService = authService;
            _dbHelper = dbHelper;
            _configuration = configuration;
            _logger = logger;
            _cache = cache;

            _ipRateLimitPerMinute = int.Parse(_configuration["AuthSettings:IpRateLimitPerMinute"] ?? "30");
            _userRateLimitPerMinute = int.Parse(_configuration["AuthSettings:UserRateLimitPerMinute"] ?? "10");
            _bcryptWorkFactor = int.Parse(_configuration["AuthSettings:BcryptWorkFactor"] ?? "12");
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });

            string ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            try
            {
                var result = await _authService.AuthenticateAsync(request.Username, request.Password, ip);
                if (result == null) return Unauthorized(new { error = "Invalid credentials." });

                // 1. Set HttpOnly Cookie for Web Clients (The "Session")
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // Ensure true in production (requires HTTPS)
                    SameSite = SameSiteMode.None, // Allow cross-site for decoupled frontends
                    Expires = DateTime.UtcNow.AddDays(7)
                };

                // Adjust for local dev if needed
                if (_configuration["Environment"] == "Development")
                {
                    cookieOptions.SameSite = SameSiteMode.Lax;
                    cookieOptions.Secure = false; 
                }

                Response.Cookies.Append("auth_session", result.Token, cookieOptions);

                // 2. Return JSON for Mobile Clients (Header-based auth)
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return StatusCode(500, new { error = "Internal server error." });
            }
        }

        [HttpPost("refresh-token")]
        // Add [FromBody] to accept JSON, but make it nullable so Web requests (which have no body) don't fail
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? request = null)
        {
            // 1. Try to get token from Cookie (Web)
            var refreshToken = Request.Cookies["refreshToken"];
            // 2. If Cookie is missing, try to get from JSON Body (Mobile)
            if (string.IsNullOrEmpty(refreshToken) && request != null)
            {
                refreshToken = request.Token;
            }
            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized(new { message = "Token required" });

            try
            {
                var result = await _authService.RefreshTokenAsync(refreshToken);

                // Set Cookie for Web (preserves existing behavior)
                SetTokenCookie(result.RefreshToken);

                // Return result (which now includes RefreshToken in the body for Mobile)
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Refresh token failed: {Message}", ex.Message);
                return Unauthorized(new { message = "Invalid token" });
            }
        }

        [HttpPost("revoke-token")]
        [Authorize]
        public IActionResult RevokeToken()
        {
            // Optional: Implement revocation logic in AuthService if needed
            // For now, we just clear the cookie
            Response.Cookies.Delete("refreshToken");
            return Ok(new { message = "Token revoked" });
        }

        // Note: Kept Register/ChangePassword/Me as-is (using DBHelper) to ensure they work 
        // with your current codebase. Ideally, move these to AuthService later.

        [Authorize]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int currentUserId)) return Unauthorized();

            // Dapper: Check Admin Status
            bool isAdmin = await _dbHelper.ExecuteScalarAsync<bool>("SELECT is_admin FROM userlist WHERE id = @Id", new { Id = currentUserId });
            if (!isAdmin) return StatusCode(403, new ErrorResponse { Error = "Only admins can register new users." });

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new ErrorResponse { Error = "Username and password are required." });

            try
            {
                string bcryptHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
                string sql = @"INSERT INTO userlist (username, password_hash, name, created_on) 
                               VALUES (@Username, @Hash, @Name, now()) 
                               RETURNING id;";

                // Dapper: ExecuteScalar
                int newId = await _dbHelper.ExecuteScalarAsync<int>(sql, new { Username = request.Username, Hash = bcryptHash, Name = request.Name });

                return Ok(new { message = "User registered successfully", userId = newId });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                return Conflict(new ErrorResponse { Error = "Username already exists." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration error");
                return StatusCode(500, new ErrorResponse { Error = "Internal server error." });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            try
            {
                // Dapper: Get Hash
                string? storedHash = await _dbHelper.QuerySingleAsync<string>("SELECT password_hash FROM userlist WHERE id = @Id", new { Id = userId });

                if (string.IsNullOrEmpty(storedHash)) return NotFound("User not found");

                if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, storedHash))
                    return Unauthorized(new ErrorResponse { Error = "Current password is incorrect." });

                string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, _bcryptWorkFactor);

                // Dapper: Execute
                await _dbHelper.ExecuteAsync("UPDATE userlist SET password_hash = @Hash, updated_on = now() WHERE id = @Id",
                    new { Hash = newHash, Id = userId });

                return Ok(new { message = "Password changed successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ChangePassword error");
                return StatusCode(500, new ErrorResponse { Error = "Server error." });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            var user = await _dbHelper.QuerySingleAsync<Models.User>("SELECT * FROM userlist WHERE id = @Id", new { Id = userId });
            if (user == null) return NotFound();

            return Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Name = user.Name,
                isAdmin = user.IsAdmin
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("auth_session", new CookieOptions { 
                HttpOnly = true, 
                Secure = true, 
                SameSite = SameSiteMode.None 
            });
            return Ok(new { message = "Logged out successfully" });
        }

        // --- Helpers ---

        private void SetTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = DateTime.UtcNow.AddDays(7),
                SameSite = SameSiteMode.None, // Required for cross-site cookie if frontend/backend domains differ
                Secure = true // HTTPS only (use false for localhost if not using https)
            };
            Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        private void IncrementRateCounters(string username, string ip)
        {
            _ = IsRateLimited($"ip:{ip}", _ipRateLimitPerMinute, incrementOnly: true);
            _ = IsRateLimited($"user:{username}", _userRateLimitPerMinute, incrementOnly: true);
        }

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
            return entry.Count >= limitPerMinute;
        }

        private class RateLimitBucket { public int Count { get; set; } public DateTime WindowStart { get; set; } }
    }

    public class LoginRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; }
    public class RegisterRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; public string? Name { get; set; } }
    public class ChangePasswordRequest { public string CurrentPassword { get; set; } = ""; public string NewPassword { get; set; } = ""; }
    public class ErrorResponse { public string Error { get; set; } = ""; }
    public class RefreshTokenRequest { public string Token { get; set; } = ""; }

    public class AuthResponse
    {
        public string Token { get; set; } = "";
        //[System.Text.Json.Serialization.JsonIgnore]
        public string RefreshToken { get; set; } = "";
        public UserDto User { get; set; } = new UserDto();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = "";
        public string? Name { get; set; }
        public bool isAdmin { get; set; }
    }
}