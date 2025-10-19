using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Optional: add policy for admin-only access
    public class AdminController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<AdminController> _logger;

        public AdminController(DBHelper dbHelper, ILogger<AdminController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        // -------------------------
        // GET api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                string sql = "SELECT id, username, name, created_on, is_admin FROM userlist ORDER BY created_on DESC";
                var dt = await _dbHelper.GetTableAsync(sql);
                var users = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    users.Add(new
                    {
                        Id = Convert.ToInt32(row["id"]),
                        Username = row["username"] == DBNull.Value ? null : row["username"]?.ToString(),
                        Name = row["name"] == DBNull.Value ? null : row["name"]?.ToString(),
                        CreatedOn = row["created_on"] == DBNull.Value ? (DateTime?)null : (DateTime)row["created_on"],
                        isAdmin = row["is_admin"] != DBNull.Value && Convert.ToBoolean(row["is_admin"])
                    });
                }
                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching users");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // -------------------------
        // GET api/admin/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetAllCategories()
        {
            try
            {
                string sql = "SELECT id, name, description, color_hex, icon_name, created_on FROM task_category WHERE is_deleted = FALSE ORDER BY name";
                var dt = await _dbHelper.GetTableAsync(sql);
                var categories = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    categories.Add(new
                    {
                        Id = Convert.ToInt32(row["id"]),
                        Name = row["name"] == DBNull.Value ? null : row["name"]?.ToString(),
                        Description = row["description"] == DBNull.Value ? null : row["description"]?.ToString(),
                        ColorHex = row["color_hex"] == DBNull.Value ? null : row["color_hex"]?.ToString(),
                        IconName = row["icon_name"] == DBNull.Value ? null : row["icon_name"]?.ToString(),
                        CreatedOn = row["created_on"] == DBNull.Value ? (DateTime?)null : (DateTime)row["created_on"]
                    });
                }
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching categories");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // -------------------------
        // DELETE api/admin/users/{id}
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                string sql = "UPDATE userlist SET is_deleted = TRUE, updated_on = now() WHERE id = @id";
                int rows = await _dbHelper.ExecuteQueryAsync(sql, new NpgsqlParameter("@id", id));
                if (rows == 1) return Ok(new { message = "User deleted successfully" });
                return NotFound(new { error = "User not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // -------------------------
        // DELETE api/admin/categories/{id}
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            try
            {
                string sql = "UPDATE task_category SET is_deleted = TRUE, updated_on = now() WHERE id = @id";
                int rows = await _dbHelper.ExecuteQueryAsync(sql, new NpgsqlParameter("@id", id));
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
