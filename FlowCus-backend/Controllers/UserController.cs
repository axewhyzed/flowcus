using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly ILogger<UserController> _logger;

        public UserController(UserService userService, ILogger<UserController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        // GET api/user/me
        [HttpGet("me")]
        public async Task<IActionResult> GetProfile()
        {
            int userId = GetCurrentUserId();

            try
            {
                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                    return NotFound(new { error = "User not found" });

                return Ok(new
                {
                    user.Id,
                    user.Username,
                    user.Name,
                    user.CreatedOn,
                    user.UpdatedOn
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profile for user {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUserById(int id)
        {
            return await FetchUserAndRespond(id);
        }

        // Helper method to avoid code duplication
        private async Task<IActionResult> FetchUserAndRespond(int userId)
        {
            try
            {
                var user = await _userService.GetByIdAsync(userId);
                if (user == null)
                    return NotFound(new { error = "User not found" });

                return Ok(new
                {
                    user.Id,
                    user.Username,
                    user.Name,
                    user.CreatedOn,
                    user.UpdatedOn,
                    user.IsAdmin
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profile for user {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/user
        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name cannot be empty" });

            int userId = GetCurrentUserId();

            try
            {
                int rows = await _userService.UpdateNameAsync(userId, request.Name.Trim());
                if (rows == 1)
                    return Ok(new { message = "Profile updated successfully" });
                else
                    return NotFound(new { error = "User not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/users
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] UserCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest(new { error = "Username is required" });

            try
            {
                if (await _userService.CheckUsernameExistsAsync(request.Username))
                    return Conflict(new { error = "Username already exists" });

                var user = await _userService.CreateUserAsync(request);

                if (user != null)
                {
                    return Ok(new
                    {
                        user.Id,
                        user.Username,
                        user.Name,
                        user.CreatedOn,
                        user.IsAdmin
                    });
                }

                return StatusCode(500, new { error = "Failed to create user" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

            if (int.TryParse(idClaim, out int userId))
                return userId;

            throw new UnauthorizedAccessException("Invalid token");
        }
    }

    public class UpdateProfileRequest { public string Name { get; set; } = ""; }
    public class UserCreateRequest 
    { 
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!; // Password is now required for account creation
        public string? Name { get; set; } 
        public bool IsAdmin { get; set; } = false; 
    }
}
