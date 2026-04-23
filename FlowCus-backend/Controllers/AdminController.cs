using FlowCus.Helpers;
using FlowCus.Models; // Needs the User model
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
        private readonly DBHelper _dbHelper;
        private readonly ILogger<AdminController> _logger;
        private readonly int _bcryptWorkFactor;

        public AdminController(DBHelper dbHelper, ILogger<AdminController> logger, IConfiguration config)
        {
            _dbHelper = dbHelper;
            _logger = logger;
            _bcryptWorkFactor = int.Parse(config["AuthSettings:BcryptWorkFactor"] ?? "12");
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
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });

            try
            {
                // Hash the password
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);

                string sql = @"
                    INSERT INTO userlist (username, password_hash, name, is_admin, created_on, is_deleted, failed_attempts, lockout_until)
                    VALUES (@Username, @PasswordHash, @Name, @IsAdmin, now(), FALSE, 0, NULL)
                    RETURNING id as Id, username as Username, name as Name, created_on as CreatedOn, is_admin as IsAdmin
                ";

                var result = await _dbHelper.QuerySingleAsync<dynamic>(sql, new
                {
                    Username = request.Username,
                    PasswordHash = passwordHash,
                    Name = request.Name,
                    IsAdmin = request.IsAdmin
                });

                return Ok(result);
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                return Conflict(new { error = "Username already exists." });
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
                    if (request.IsAdmin.Value == false)
                    {
                        bool targetIsAdmin = await _dbHelper.ExecuteScalarAsync<bool>(
                            "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE",
                            new { Id = id });

                        if (targetIsAdmin)
                        {
                            long otherAdminCount = await _dbHelper.ExecuteScalarAsync<long>(
                                "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                                new { Id = id });

                            if (otherAdminCount == 0)
                                return BadRequest(new { error = "Cannot remove admin rights from the last admin account." });
                        }
                    }

                    updates.Add("is_admin = @IsAdmin");
                    parameters["IsAdmin"] = request.IsAdmin.Value;
                }

                if (!string.IsNullOrWhiteSpace(request.Password))
                {
                    updates.Add("password_hash = @PasswordHash");
                    string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
                    parameters["PasswordHash"] = passwordHash;
                }

                if (updates.Count == 0)
                    return BadRequest(new { error = "No fields to update." });

                updates.Add("updated_on = now()");
                string sql = $"UPDATE userlist SET {string.Join(", ", updates)} WHERE id = @Id AND is_deleted = FALSE";

                int rows = await _dbHelper.ExecuteAsync(sql, parameters);

                if (rows == 0) return NotFound(new { error = "User not found" });

                var updatedUser = await _dbHelper.QuerySingleAsync<User>(
                    "SELECT * FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1",
                    new { Id = id });

                if (updatedUser == null) return NotFound(new { error = "User not found" });

                return Ok(new
                {
                    updatedUser.Id,
                    updatedUser.Username,
                    updatedUser.Name,
                    updatedUser.CreatedOn,
                    updatedUser.UpdatedOn,
                    updatedUser.IsAdmin
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
                    return BadRequest(new { error = "You cannot delete your own account. Ask another admin." });

                // PREVENT DELETING THE LAST ADMIN
                long adminCount = await _dbHelper.ExecuteScalarAsync<long>(
                    "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                    new { Id = id }
                );

                if (adminCount == 0)
                    return BadRequest(new { error = "Cannot delete the last admin account. Assign admin to another user first." });

                string sql = "UPDATE userlist SET is_deleted = TRUE, updated_on = now() WHERE id = @Id";
                int rows = await _dbHelper.ExecuteAsync(sql, new { Id = id });

                if (rows == 1) return Ok(new { message = "User deleted successfully" });
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
            try
            {
                string sql = "UPDATE task_category SET is_deleted = TRUE, updated_on = now() WHERE id = @Id";
                int rows = await _dbHelper.ExecuteAsync(sql, new { Id = id });

                if (rows == 1) return Ok(new { message = "Category deleted successfully" });
                return NotFound(new { error = "Category not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting category");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    // Helper classes for request bodies
    public class CreateUserRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string? Name { get; set; }
        public bool IsAdmin { get; set; } = false;
    }

    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public bool? IsAdmin { get; set; }
        public string? Password { get; set; }
    }
}
