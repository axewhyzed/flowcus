using FlowCus.Helpers;
using FlowCus.Models; // Needs the User model
using FlowCus.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")] // Only users with the 'Admin' role can access these endpoints
    public class AdminController : ControllerBase
    {
        private readonly IDbHelper _dbHelper;
        private readonly IUserService _userService;
        private readonly ILogger<AdminController> _logger;
        private readonly int _bcryptWorkFactor;

        public AdminController(IDbHelper dbHelper, IUserService userService, ILogger<AdminController> logger, IConfiguration config)
        {
            _dbHelper = dbHelper;
            _userService = userService;
            _logger = logger;
            _bcryptWorkFactor = int.TryParse(config["AuthSettings:BcryptWorkFactor"], out var workFactor) && workFactor is >= 4 and <= 16
                ? workFactor
                : 12;
        }

        // GET api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                // Dapper: Direct mapping to User model
                // Note: We only select fields we want to expose, or select * and map to DTO
                string sql = "SELECT * FROM userlist WHERE is_deleted = FALSE ORDER BY created_on DESC";
                var users = await _dbHelper.QueryAsync<User>(sql);
                // Map to anonymous object or DTO to hide PasswordHash
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
                string sql = "SELECT * FROM task_category WHERE is_deleted = FALSE ORDER BY name";
                var categories = await _dbHelper.QueryAsync<TaskCategory>(sql);
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
                string sql = "SELECT * FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1";
                var user = await _dbHelper.QuerySingleAsync<User>(sql, new { Id = id });
                
                if (user == null) return NotFound(new { error = "User not found" });

                // Return user without password hash
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

                int newUserId = result.Id;

                _logger.LogInformation("Admin user created. ActorUserId={ActorUserId}, NewUserId={NewUserId}", actorUserId, newUserId);
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

            int? actorUserId = GetCurrentUserIdForLog();

            try
            {
                var updates = new List<string>();
                var parameters = new Dictionary<string, object> { { "Id", id } };

                if (!string.IsNullOrWhiteSpace(request.Name))
                {
                    updates.Add("name = @Name");
                    parameters["Name"] = request.Name;
                }

                if (request.IsAdmin.HasValue)
                {
                    updates.Add("is_admin = @IsAdmin");
                    parameters["IsAdmin"] = request.IsAdmin.Value;
                }

                if (!string.IsNullOrWhiteSpace(request.Password))
                {
                    if (!PasswordPolicy.IsValid(request.Password))
                        return BadRequest(new { error = $"Password must be at least {PasswordPolicy.MinimumLength} characters long." });
                    updates.Add("password_hash = @PasswordHash");
                    string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
                    parameters["PasswordHash"] = passwordHash;
                }

                bool revokeTokens = request.IsAdmin.HasValue || !string.IsNullOrWhiteSpace(request.Password);
                if (revokeTokens)
                    updates.Add("token_version = token_version + 1");

                if (updates.Count == 0)
                {
                    _logger.LogWarning("Admin user update rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=NoFields", actorUserId, id);
                    return BadRequest(new { error = "No fields to update." });
                }

                updates.Add("updated_on = now()");
                string sql = $"UPDATE userlist SET {string.Join(", ", updates)} WHERE id = @Id AND is_deleted = FALSE";

                int rows;
                if (request.IsAdmin == false)
                {
                    rows = await _dbHelper.ExecuteInTransactionAsync(async (connection, transaction) =>
                    {
                        await connection.ExecuteAsync("SELECT pg_advisory_xact_lock(75429183::bigint)", transaction: transaction);
                        bool targetIsAdmin = await connection.ExecuteScalarAsync<bool>(
                            "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE FOR UPDATE",
                            new { Id = id }, transaction);
                        if (targetIsAdmin)
                        {
                            long otherAdminCount = await connection.ExecuteScalarAsync<long>(
                                "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                                new { Id = id }, transaction);
                            if (otherAdminCount == 0) return -1;
                        }
                        return await connection.ExecuteAsync(sql, parameters, transaction);
                    });
                    if (rows == -1)
                    {
                        _logger.LogWarning("Admin user update rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=LastAdmin", actorUserId, id);
                        return BadRequest(new { error = "Cannot remove admin rights from the last admin account." });
                    }
                }
                else
                {
                    rows = await _dbHelper.ExecuteAsync(sql, parameters);
                }

                if (rows == 0)
                {
                    _logger.LogWarning("Admin user update target not found. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", actorUserId, id);
                    return NotFound(new { error = "User not found" });
                }

                var updatedUser = await _dbHelper.QuerySingleAsync<User>(
                    "SELECT * FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1",
                    new { Id = id });

                if (updatedUser == null)
                {
                    _logger.LogWarning("Admin user update target missing after update. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", actorUserId, id);
                    return NotFound(new { error = "User not found" });
                }

                _logger.LogInformation("Admin user updated. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", actorUserId, id);
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                // Get current user ID from JWT claims
                var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(idClaim, out int currentUserId))
                    return Unauthorized();

                // PREVENT SELF-DELETE
                if (id == currentUserId)
                {
                    _logger.LogWarning("Admin user delete rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=SelfDelete", currentUserId, id);
                    return BadRequest(new { error = "You cannot delete your own account. Ask another admin." });
                }

                // PREVENT DELETING THE LAST ADMIN
                int rows = await _dbHelper.ExecuteInTransactionAsync(async (connection, transaction) =>
                {
                    await connection.ExecuteAsync("SELECT pg_advisory_xact_lock(75429183::bigint)", transaction: transaction);
                    bool targetIsAdmin = await connection.ExecuteScalarAsync<bool>(
                        "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE FOR UPDATE",
                        new { Id = id }, transaction);
                    if (targetIsAdmin)
                    {
                        long otherAdminCount = await connection.ExecuteScalarAsync<long>(
                            "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                            new { Id = id }, transaction);
                        if (otherAdminCount == 0) return -1;
                    }

                    return await connection.ExecuteAsync(
                        "UPDATE userlist SET is_deleted = TRUE, token_version = token_version + 1, updated_on = now() WHERE id = @Id AND is_deleted = FALSE",
                        new { Id = id }, transaction);
                });

                if (rows == -1)
                {
                    _logger.LogWarning("Admin user delete rejected. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}, Reason=LastAdmin", currentUserId, id);
                    return BadRequest(new { error = "Cannot delete the last admin account. Assign admin to another user first." });
                }

                if (rows == 1)
                {
                    _logger.LogInformation("Admin user deleted. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", currentUserId, id);
                    return Ok(new { message = "User deleted successfully" });
                }

                _logger.LogWarning("Admin user delete target not found. ActorUserId={ActorUserId}, TargetUserId={TargetUserId}", currentUserId, id);
                return NotFound(new { error = "User not found" });
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
                long referenceCount = await _dbHelper.ExecuteScalarAsync<long>(@"
                    SELECT
                        (SELECT COUNT(*) FROM tasks WHERE task_category_id = @Id AND is_deleted = FALSE) +
                        (SELECT COUNT(*) FROM task_subtypes WHERE category_id = @Id AND is_deleted = FALSE) +
                        (SELECT COUNT(*) FROM timetable_items WHERE task_category_id = @Id AND is_deleted = FALSE)",
                    new { Id = id });

                if (referenceCount > 0)
                {
                    _logger.LogWarning("Admin category delete rejected. ActorUserId={ActorUserId}, CategoryId={CategoryId}, Reason=Referenced", actorUserId, id);
                    return BadRequest(new { error = "Category is still used by tasks, subcategories, or timetable items." });
                }

                string sql = "UPDATE task_category SET is_deleted = TRUE, updated_on = now() WHERE id = @Id";
                int rows = await _dbHelper.ExecuteAsync(sql, new { Id = id });

                if (rows == 1)
                {
                    _logger.LogInformation("Admin category deleted. ActorUserId={ActorUserId}, CategoryId={CategoryId}", actorUserId, id);
                    return Ok(new { message = "Category deleted successfully" });
                }

                _logger.LogWarning("Admin category delete target not found. ActorUserId={ActorUserId}, CategoryId={CategoryId}", actorUserId, id);
                return NotFound(new { error = "Category not found" });
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

    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public bool? IsAdmin { get; set; }
        public string? Password { get; set; }
    }
}
