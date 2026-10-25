using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services;
using FlowCus.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IAuthRateLimiter _authRateLimiter;
        private readonly IUserService _userService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly string[] _allowedOrigins;

        public AuthController(
            IAuthService authService,
            IAuthRateLimiter authRateLimiter,
            IUserService userService,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IWebHostEnvironment environment)
        {
            _authService = authService;
            _authRateLimiter = authRateLimiter;
            _userService = userService;
            _configuration = configuration;
            _logger = logger;
            _environment = environment;
            _allowedOrigins = SecurityConfiguration.GetAllowedOrigins(environment);
        }

        public AuthController(
            IAuthService authService,
            IAuthRateLimiter authRateLimiter,
            IUserService userService,
            IDbHelper? dbHelper,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IWebHostEnvironment environment)
            : this(authService, authRateLimiter, userService, configuration, logger, environment)
        {
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });

            bool cookieMode = string.Equals(Request.Headers["X-Auth-Mode"].ToString(), "cookie", StringComparison.OrdinalIgnoreCase);
            if (cookieMode && !CsrfProtection.IsTrustedOrigin(Request.Headers["Origin"].FirstOrDefault(), _allowedOrigins))
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Untrusted request origin." });

            string ip = AuthRateLimitIdentity.NormalizeIp(HttpContext.Connection.RemoteIpAddress);
            var rateLimit = await _authRateLimiter.CheckAsync(
                request.Username,
                HttpContext.Connection.RemoteIpAddress,
                HttpContext.RequestAborted);
            if (!rateLimit.Allowed)
            {
                _logger.LogWarning("Rate limit exceeded for user {Username} from IP {Ip}", request.Username, ip);
                Response.Headers["Retry-After"] = rateLimit.RetryAfterSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
                return StatusCode(429, new { error = "Too many requests. Please try again later." });
            }

            try
            {
                var result = await _authService.AuthenticateAsync(request.Username, request.Password);
                
                if (!result.Success)
                {
                    _logger.LogWarning("Login failed. Username={Username}, Ip={Ip}, Reason={Reason}", request.Username, ip, result.ErrorMessage);
                    
                    return Unauthorized(new { error = result.ErrorMessage ?? "Invalid credentials." });
                }

                var loginResponse = result.Response!;

                string csrfToken = CreateCsrfToken();
                SetSessionCookies(loginResponse.Token, csrfToken);
                loginResponse.CsrfToken = csrfToken;

                _logger.LogInformation("Login succeeded. UserId={UserId}, Username={Username}, Ip={Ip}", loginResponse.User.Id, loginResponse.User.Username, ip);
                return cookieMode
                    ? Ok(new { user = loginResponse.User, csrfToken })
                    : Ok(loginResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return StatusCode(500, new { error = "Internal server error." });
            }
        }

        [Authorize]
        [HttpGet("csrf")]
        public IActionResult GetCsrfToken()
        {
            string? csrfToken = Request.Cookies["XSRF-TOKEN"];
            if (string.IsNullOrWhiteSpace(csrfToken))
            {
                csrfToken = CreateCsrfToken();
                SetCsrfCookie(csrfToken);
            }
            return Ok(new { csrfToken });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int currentUserId)) return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new ErrorResponse { Error = "Username and password are required." });
            if (!PasswordPolicy.IsValid(request.Password))
                return BadRequest(new ErrorResponse { Error = $"Password must be at least {PasswordPolicy.MinimumLength} characters long." });

            try
            {
                var user = await _userService.CreateUserAsync(new UserCreateRequest
                {
                    Username = request.Username,
                    Password = request.Password,
                    Name = request.Name
                });
                _logger.LogInformation("User registered. ActorUserId={ActorUserId}, NewUserId={NewUserId}", currentUserId, user?.Id);
                return Ok(new { message = "User registered successfully", userId = user?.Id });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ErrorResponse { Error = ex.Message });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                _logger.LogWarning("User registration conflict. ActorUserId={ActorUserId}", currentUserId);
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
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new ErrorResponse { Error = "Current password and new password are required." });

            if (!PasswordPolicy.IsValid(request.NewPassword))
                return BadRequest(new ErrorResponse { Error = $"New password must be at least {PasswordPolicy.MinimumLength} characters long." });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            try
            {
                var result = await _userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
                switch (result)
                {
                    case ChangePasswordResult.UserNotFound:
                        return NotFound("User not found");
                    case ChangePasswordResult.InvalidCurrentPassword:
                        _logger.LogWarning("Password change rejected. UserId={UserId}, Reason=InvalidCurrentPassword", userId);
                        return BadRequest(new ErrorResponse { Error = "Current password is incorrect." });
                    case ChangePasswordResult.ConcurrencyConflict:
                        return Conflict(new ErrorResponse { Error = "Password changed while this request was in progress. Please try again." });
                    case ChangePasswordResult.Success:
                    default:
                        _logger.LogInformation("Password changed. UserId={UserId}", userId);
                        return Ok(new { message = "Password changed successfully." });
                }
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
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            var user = await _userService.GetByIdAsync(userId);
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
        [AllowAnonymous]
        public async Task<IActionResult> Logout()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out int userId))
            {
                await _userService.RevokeUserTokensAsync(userId);
            }
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/"
            };

            if (_environment.IsDevelopment())
            {
                cookieOptions.SameSite = SameSiteMode.Lax;
                cookieOptions.Secure = false;
            }

            Response.Cookies.Delete("auth_session", cookieOptions);
            cookieOptions.HttpOnly = false;
            Response.Cookies.Delete("XSRF-TOKEN", cookieOptions);
            _logger.LogInformation("Logout succeeded. UserId={UserId}", idClaim ?? "anonymous");
            return Ok(new { message = "Logged out successfully" });
        }

        // --- Helpers ---
        private static string CreateCsrfToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        private void SetSessionCookies(string token, string csrfToken)
        {
            var expires = DateTimeOffset.UtcNow.AddDays(7);
            Response.Cookies.Append("auth_session", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = _environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
                Expires = expires,
                Path = "/"
            });
            SetCsrfCookie(csrfToken, expires);
        }

        private void SetCsrfCookie(string csrfToken, DateTimeOffset? expires = null)
        {
            Response.Cookies.Append("XSRF-TOKEN", csrfToken, new CookieOptions
            {
                HttpOnly = false,
                Secure = !_environment.IsDevelopment(),
                SameSite = _environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
                Expires = expires ?? DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            });
        }
    }

    public class LoginRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; }
    public class RegisterRequest { public string Username { get; set; } = ""; public string Password { get; set; } = ""; public string? Name { get; set; } }
    public class ChangePasswordRequest { public string CurrentPassword { get; set; } = ""; public string NewPassword { get; set; } = ""; }
    public class ErrorResponse { public string Error { get; set; } = ""; }
}
