using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITaskCategoryService _categoryService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(IUserService userService, ITaskCategoryService categoryService, ILogger<AdminController> logger)
        {
            _userService = userService;
            _categoryService = categoryService;
            _logger = logger;
        }

        // GET api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _userService.GetAllAsync();
                var result = users.Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Name,
                    u.CreatedOn,
                    u.IsAdmin
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/admin/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetAllCategories()
        {
            try
            {
                var categories = await _categoryService.GetAllAsync();
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching categories");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/admin/users/{id}
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            try
            {
                var user = await _userService.GetByIdAsync(id);
                if (user == null) return NotFound(new { error = "User not found" });

                return Ok(new
                {
                    user.Id,
                    user.Username,
                    user.Name,
                    user.CreatedOn,
                    user.IsAdmin
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/admin/users
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] UserCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });
            if (!PasswordPolicy.IsValid(request.Password))
                return BadRequest(new { error = $"Password must be at least {PasswordPolicy.MinimumLength} characters long." });

            int? actorUserId = GetCurrentUserIdForLog();

            try
            {
                var result = await _userService.CreateUserAsync(request);
                if (result == null)
                {
                    _logger.LogError("Admin user create failed without returned user. ActorUserId={ActorUserId}, Username={Username}", actorUserId, request.Username);
                    return StatusCode(500, new { error = "Failed to create user" });
                }

                _logger.LogInformation("Admin user created. ActorUserId={ActorUserId}, NewUserId={NewUserId}", actorUserId, result.Id);
                return Ok(new
                {
                    result.Id,
                    result.Username,
                    result.Name,
                    result.CreatedOn,
                    result.IsAdmin,
                    message = "User created successfully"
                });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                _logger.LogWarning("Admin user create conflict. ActorUserId={ActorUserId}, Username={Username}", actorUserId, request.Username);
                return Conflict(new { error = "Username already exists." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/admin/users/{id}
        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            if (id <= 0 || request == null)
                return BadRequest(new { error = "Invalid request data." });

            if (!string.IsNullOrWhiteSpace(request.Password) && !PasswordPolicy.IsValid(request.Password))
                return BadRequest(new { error = $"Password must be at least {PasswordPolicy.MinimumLength} characters long." });

            int? actorUserId = GetCurrentUserIdForLog();

            try
            {
                var result = await _userService.UpdateUserAdminAsync(id, request);
                switch (result.Status)
                {
                    case AdminUpdateStatus.NoFields:
                        _logger.LogWarning("Admin user update rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=NoFields", actorUserId, id);
                        return BadRequest(new { error = result.ErrorMessage });
                    case AdminUpdateStatus.CannotDemoteLastAdmin:
                        _logger.LogWarning("Admin user update rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=LastAdmin", actorUserId, id);
                        return BadRequest(new { error = result.ErrorMessage });
                    case AdminUpdateStatus.NotFound:
                        _logger.LogWarning("Admin user update target not found. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", actorUserId, id);
                        return NotFound(new { error = result.ErrorMessage });
                    case AdminUpdateStatus.Success:
                    default:
                        _logger.LogInformation("Admin user updated. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", actorUserId, id);
                        var updatedUser = result.User!;
                        return Ok(new
                        {
                            updatedUser.Id,
                            updatedUser.Username,
                            updatedUser.Name,
                            updatedUser.CreatedOn,
                            updatedUser.UpdatedOn,
                            updatedUser.IsAdmin,
                            message = "User updated successfully"
                        });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/admin/users/{id}
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int currentUserId))
                return Unauthorized();

            try
            {
                var status = await _userService.DeleteUserAdminAsync(id, currentUserId);
                switch (status)
                {
                    case AdminDeleteStatus.SelfDelete:
                        _logger.LogWarning("Admin user delete rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=SelfDelete", currentUserId, id);
                        return BadRequest(new { error = "You cannot delete your own account. Ask another admin." });
                    case AdminDeleteStatus.LastAdmin:
                        _logger.LogWarning("Admin user delete rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=LastAdmin", currentUserId, id);
                        return BadRequest(new { error = "Cannot delete the last admin account. Assign admin to another user first." });
                    case AdminDeleteStatus.NotFound:
                        _logger.LogWarning("Admin user delete target not found. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", currentUserId, id);
                        return NotFound(new { error = "User not found" });
                    case AdminDeleteStatus.Success:
                    default:
                        _logger.LogInformation("Admin user deleted. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", currentUserId, id);
                        return Ok(new { message = "User deleted successfully" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/admin/categories/{id}
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            int? actorUserId = GetCurrentUserIdForLog();

            try
            {
                bool deleted = await _categoryService.DeleteAsync(id);
                if (deleted)
                {
                    _logger.LogInformation("Admin category deleted. ActorUserId={ActorUserId}, CategoryId={CategoryId}", actorUserId, id);
                    return Ok(new { message = "Category deleted successfully" });
                }

                _logger.LogWarning("Admin category delete target not found. ActorUserId={ActorUserId}, CategoryId={CategoryId}", actorUserId, id);
                return NotFound(new { error = "Category not found" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Admin category delete rejected. ActorUserId={ActorUserId}, CategoryId={CategoryId}, Reason=Referenced", actorUserId, id);
                return BadRequest(new { error = ex.Message });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23503")
            {
                _logger.LogWarning(ex, "Category delete rejected because active records still reference it. CategoryId={CategoryId}", id);
                return BadRequest(new { error = "Category is still used by tasks, subtypes, or timetable items." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting category");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        private int? GetCurrentUserIdForLog()
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : null;
        }
    }
}
