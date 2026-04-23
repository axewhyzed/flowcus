using FlowCus.Helpers;
using FlowCus.Services;
using FlowCus.Controllers;
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
        private readonly DBHelper _dbHelper; 
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
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });

            string ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (IncrementAndCheckRateLimits(request.Username, ip))
            {
                _logger.LogWarning($"Rate limit exceeded for user {request.Username} from IP {ip}");
                return StatusCode(429, new { error = "Too many requests. Please try again later." });
            }

            try
            {
                var result = await _authService.AuthenticateAsync(request.Username, request.Password);
                
                if (result is null) return Unauthorized(new { error = "Invalid credentials." });

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, 
                    SameSite = SameSiteMode.None,
                    Expires = DateTime.UtcNow.AddDays(7) 
                };

                if (_configuration["Environment"] == "Development")
                {
                    cookieOptions.SameSite = SameSiteMode.Lax;
                    cookieOptions.Secure = false; 
                }

                Response.Cookies.Append("auth_session", result.Token, cookieOptions);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return StatusCode(500, new { error = "Internal server error." });
            }
        }

        [Authorize]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int currentUserId)) return Unauthorized();

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
            // validate that new password is not empty
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new ErrorResponse { Error = "Current password and new password are required." });

            if (request.NewPassword.Length < 6)
                return BadRequest(new ErrorResponse { Error = "New password must be at least 6 characters long." });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            try
            {
                string? storedHash = await _dbHelper.QuerySingleAsync<string>("SELECT password_hash FROM userlist WHERE id = @Id", new { Id = userId });

                if (string.IsNullOrEmpty(storedHash)) return NotFound("User not found");

                if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, storedHash))
                    return Unauthorized(new ErrorResponse { Error = "Current password is incorrect." });

                string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, _bcryptWorkFactor);

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
                IsAdmin = user.IsAdmin
            });
        }

        [HttpPost("logout")]
        [Authorize] // SECURITY FIX: Require authorization to prevent unauthorized endpoint exposure
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
        private bool IncrementAndCheckRateLimits(string username, string ip)
        {
            bool ipLimited = IsRateLimited($"ip:{ip}", _ipRateLimitPerMinute, incrementOnly: true);
            bool userLimited = IsRateLimited($"user:{username}", _userRateLimitPerMinute, incrementOnly: true);
            
            return ipLimited || userLimited;
        }

        private bool IsRateLimited(string key, int limitPerMinute, bool incrementOnly = false)
        {
            var now = DateTime.UtcNow;
            string cacheKey = $"ratelimit:{key}";

            lock (_rateLimitLock)  // Add synchronization lock
            {
                var entry = _cache.Get<RateLimitBucket>(cacheKey);

                if (entry == null)
                {
                    // First request in this window
                    _cache.Set(cacheKey, new RateLimitBucket { Count = 1, WindowStart = now },
                        new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
                    return false;
                }

                // Check if window expired
                if ((now - entry.WindowStart).TotalMinutes >= 1.0)
                {
                    // Reset window
                    entry.Count = 1;
                    entry.WindowStart = now;
                    _cache.Set(cacheKey, entry, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
                    return false;
                }

                // Still in current window
                entry.Count++;
                _cache.Set(cacheKey, entry, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });

                return entry.Count > limitPerMinute;
            }
        }

        private readonly object _rateLimitLock = new object();
        private class RateLimitBucket { public int Count { get; set; } public DateTime WindowStart { get; set; } }
    }

    public class LoginRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; }
    public class RegisterRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; public string? Name { get; set; } }
    public class ChangePasswordRequest { public string CurrentPassword { get; set; } = ""; public string NewPassword { get; set; } = ""; }
    public class ErrorResponse { public string Error { get; set; } = ""; }
    public class RefreshTokenRequest { public string Token { get; set; } = ""; }

    // FIXED: Renamed to LoginResponse to prevent namespace collision
    public class LoginResponse
    {
        public string Token { get; set; } = "";
        public UserDto User { get; set; } = new UserDto();
    }

    public class UserDto 
    { 
        public int Id { get; set; } 
        public string Username { get; set; } = ""; 
        public string? Name { get; set; } 
        public bool IsAdmin { get; set; } // FIX: Use PascalCase per C# conventions
    }
}