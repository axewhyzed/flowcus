using FlowCus.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(DBHelper dbHelper, IConfiguration configuration, ILogger<AuthController> logger)
        {
            _dbHelper = dbHelper;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Login endpoint for JWT authentication
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest("Username and password are required.");

            try
            {
                // Query your userlist table
                string query = "SELECT id, username, password FROM userlist WHERE username = @username LIMIT 1";
                var param = new NpgsqlParameter("@username", request.Username);

                DataTable dt = await _dbHelper.GetTableAsync(query, param);

                if (dt.Rows.Count == 0)
                {
                    _logger.LogWarning("Login failed: user {User} not found", request.Username);
                    return Unauthorized("Invalid credentials.");
                }

                var row = dt.Rows[0];
                int userId = Convert.ToInt32(row["id"]);
                string dbPassword = row["password"].ToString();

                // 🔐 If you stored encrypted password (with CryptoHelper.Encrypt):
                string decryptedPass = CryptoHelper.Decrypt(dbPassword, _logger);

                if (decryptedPass != request.Password)
                {
                    _logger.LogWarning("Login failed: incorrect password for {User}", request.Username);
                    return Unauthorized("Invalid credentials.");
                }

                // At this point, login is valid → generate JWT
                string token = GenerateJwtToken(userId, request.Username);

                return Ok(new
                {
                    token,
                    user = new
                    {
                        id = userId,
                        username = request.Username
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for user {User}", request.Username);
                return StatusCode(500, "Internal server error occurred.");
            }
        }

        /// <summary>
        /// Logout endpoint - clears client-side token
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            try
            {
                // Get current user info from JWT
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value;

                _logger.LogInformation("User {Username} (ID: {UserId}) logged out successfully", username, userId);

                return Ok(new
                {
                    message = "Logged out successfully",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, "Internal server error occurred.");
            }
        }

        // ----------------- Helpers ----------------
        private string GenerateJwtToken(int userId, string username)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])); // add a 32 character jwt in env var
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7), // 7d validity
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // Login DTO
    public class LoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}