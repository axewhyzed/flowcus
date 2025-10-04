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
    [Authorize] // You can later add policy or role-based authorization for admin-only access
    public class TaskCategoryController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TaskCategoryController> _logger;

        public TaskCategoryController(DBHelper dbHelper, ILogger<TaskCategoryController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        // GET api/taskcategory
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                string sql = "SELECT id, name, description, color_hex, icon_name, created_on FROM task_category WHERE is_deleted = FALSE ORDER BY name";
                var dt = await _dbHelper.GetTableAsync(sql);

                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        Id = row["id"],
                        Name = row["name"],
                        Description = row["description"],
                        ColorHex = row["color_hex"],
                        IconName = row["icon_name"],
                        CreatedOn = row["created_on"]
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task categories");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/taskcategory/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            try
            {
                string sql = "SELECT id, name, description, color_hex, icon_name, created_on FROM task_category WHERE id = @id AND is_deleted = FALSE";
                var p = new NpgsqlParameter("@id", id);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                if (dt.Rows.Count == 0)
                    return NotFound(new { error = "Task category not found" });

                var row = dt.Rows[0];
                return Ok(new
                {
                    Id = row["id"],
                    Name = row["name"],
                    Description = row["description"],
                    ColorHex = row["color_hex"],
                    IconName = row["icon_name"],
                    CreatedOn = row["created_on"]
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task category {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/taskcategory
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name is required" });

            try
            {
                string sql = @"
                    INSERT INTO task_category (name, description, color_hex, icon_name, created_on)
                    VALUES (@name, @desc, @color, @icon, now())
                    RETURNING id";
                var p1 = new NpgsqlParameter("@name", request.Name);
                var p2 = new NpgsqlParameter("@desc", (object?)request.Description ?? DBNull.Value);
                var p3 = new NpgsqlParameter("@color", (object?)request.ColorHex ?? DBNull.Value);
                var p4 = new NpgsqlParameter("@icon", (object?)request.IconName ?? DBNull.Value);

                object? res = await _dbHelper.GetValueAsync(sql, p1, p2, p3, p4);
                if (res == null) return StatusCode(500, new { error = "Could not create task category" });

                return CreatedAtAction(nameof(Get), new { id = Convert.ToInt32(res) }, new { id = res });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                return Conflict(new { error = "Task category name must be unique" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task category");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/taskcategory/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name is required" });

            try
            {
                string sql = @"
                    UPDATE task_category
                    SET name = @name, description = @desc, color_hex = @color, icon_name = @icon
                    WHERE id = @id AND is_deleted = FALSE";
                var p1 = new NpgsqlParameter("@name", request.Name);
                var p2 = new NpgsqlParameter("@desc", (object?)request.Description ?? DBNull.Value);
                var p3 = new NpgsqlParameter("@color", (object?)request.ColorHex ?? DBNull.Value);
                var p4 = new NpgsqlParameter("@icon", (object?)request.IconName ?? DBNull.Value);
                var p5 = new NpgsqlParameter("@id", id);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2, p3, p4, p5);
                if (rows == 1)
                    return Ok(new { message = "Task category updated successfully" });
                return NotFound(new { error = "Task category not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task category {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/taskcategory/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                string sql = "UPDATE task_category SET is_deleted = TRUE WHERE id = @id";
                var p = new NpgsqlParameter("@id", id);
                int rows = await _dbHelper.ExecuteQueryAsync(sql, p);

                if (rows == 1)
                    return Ok(new { message = "Task category deleted successfully" });
                return NotFound(new { error = "Task category not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task category {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class TaskCategoryRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? ColorHex { get; set; }
        public string? IconName { get; set; }
    }
}
