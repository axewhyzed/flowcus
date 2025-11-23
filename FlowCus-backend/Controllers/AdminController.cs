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
    [Authorize(Roles = "Admin")] // SECURITY FIX: Only users with the 'Admin' role can access these endpoints
    public class AdminController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<AdminController> _logger;

        public AdminController(DBHelper dbHelper, ILogger<AdminController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
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

        // DELETE api/admin/users/{id}
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
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
}