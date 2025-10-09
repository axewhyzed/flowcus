using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TaskSubtypeController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TaskSubtypeController> _logger;

        public TaskSubtypeController(DBHelper dbHelper, ILogger<TaskSubtypeController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : throw new UnauthorizedAccessException("Invalid user ID");
        }

        // GET api/tasksubtype
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    SELECT ts.id, ts.name, ts.color_hex, ts.icon_name, ts.created_on, ts.category_id, tc.name AS category_name
                    FROM task_subtypes ts
                    JOIN task_category tc ON ts.category_id = tc.id
                    WHERE ts.user_id = @userId AND ts.is_deleted = FALSE
                    ORDER BY ts.name";
                var p = new NpgsqlParameter("@userId", userId);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        Id = Convert.ToInt32(row["id"]),
                        Name = row["name"] == DBNull.Value ? null : row["name"]?.ToString(),
                        ColorHex = row["color_hex"] == DBNull.Value ? null : row["color_hex"]?.ToString(),
                        IconName = row["icon_name"] == DBNull.Value ? null : row["icon_name"]?.ToString(),
                        CreatedOn = row["created_on"] == DBNull.Value ? (DateTime?)null : (DateTime)row["created_on"],
                        CategoryId = Convert.ToInt32(row["category_id"]),
                        CategoryName = row["category_name"] == DBNull.Value ? null : row["category_name"]?.ToString()
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task subtypes");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/tasksubtype/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    SELECT ts.id, ts.name, ts.color_hex, ts.icon_name, ts.created_on, ts.category_id, tc.name AS category_name
                    FROM task_subtypes ts
                    JOIN task_category tc ON ts.category_id = tc.id
                    WHERE ts.id = @id AND ts.user_id = @userId AND ts.is_deleted = FALSE";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                var dt = await _dbHelper.GetTableAsync(sql, p1, p2);
                if (dt.Rows.Count == 0)
                    return NotFound(new { error = "Task subtype not found" });

                var row = dt.Rows[0];
                return Ok(new
                {
                    Id = Convert.ToInt32(row["id"]),
                    Name = row["name"] == DBNull.Value ? null : row["name"]?.ToString(),
                    ColorHex = row["color_hex"] == DBNull.Value ? null : row["color_hex"]?.ToString(),
                    IconName = row["icon_name"] == DBNull.Value ? null : row["icon_name"]?.ToString(),
                    CreatedOn = row["created_on"] == DBNull.Value ? (DateTime?)null : (DateTime)row["created_on"],
                    CategoryId = Convert.ToInt32(row["category_id"]),
                    CategoryName = row["category_name"] == DBNull.Value ? null : row["category_name"]?.ToString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task subtype {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/tasksubtype
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskSubtypeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.CategoryId <= 0)
                return BadRequest(new { error = "Name and valid CategoryId are required" });

            try
            {
                int userId = GetCurrentUserId();

                string sql = @"
                    INSERT INTO task_subtypes (user_id, category_id, name, color_hex, icon_name, created_on)
                    VALUES (@userId, @catId, @name, @color, @icon, now())
                    RETURNING id";
                var p1 = new NpgsqlParameter("@userId", userId);
                var p2 = new NpgsqlParameter("@catId", request.CategoryId);
                var p3 = new NpgsqlParameter("@name", request.Name.Trim());
                var p4 = new NpgsqlParameter("@color", (object?)request.ColorHex ?? DBNull.Value);
                var p5 = new NpgsqlParameter("@icon", (object?)request.IconName ?? DBNull.Value);

                object? res = await _dbHelper.GetValueAsync(sql, p1, p2, p3, p4, p5);
                if (res == null)
                    return StatusCode(500, new { error = "Could not create task subtype" });

                return CreatedAtAction(nameof(Get), new { id = Convert.ToInt32(res) }, new { id = res });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                return Conflict(new { error = "Task subtype name must be unique per user" });
            }
            catch (PostgresException pgEx) when (pgEx.Message.Contains("enforce_subtype_limit"))
            {
                return BadRequest(new { error = "Subtype limit reached (max 5 allowed per user)" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task subtype");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/tasksubtype/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskSubtypeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.CategoryId <= 0)
                return BadRequest(new { error = "Name and valid CategoryId are required" });

            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    UPDATE task_subtypes
                    SET name = @name, category_id = @catId, color_hex = @color, icon_name = @icon
                    WHERE id = @id AND user_id = @userId AND is_deleted = FALSE";
                var p1 = new NpgsqlParameter("@name", request.Name.Trim());
                var p2 = new NpgsqlParameter("@catId", request.CategoryId);
                var p3 = new NpgsqlParameter("@color", (object?)request.ColorHex ?? DBNull.Value);
                var p4 = new NpgsqlParameter("@icon", (object?)request.IconName ?? DBNull.Value);
                var p5 = new NpgsqlParameter("@id", id);
                var p6 = new NpgsqlParameter("@userId", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2, p3, p4, p5, p6);
                if (rows == 1)
                    return Ok(new { message = "Task subtype updated successfully" });

                return NotFound(new { error = "Task subtype not found" });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                return Conflict(new { error = "Task subtype name must be unique per user" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task subtype {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/tasksubtype/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = "UPDATE task_subtypes SET is_deleted = TRUE WHERE id = @id AND user_id = @userId";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2);
                if (rows == 1)
                    return Ok(new { message = "Task subtype deleted successfully" });

                return NotFound(new { error = "Task subtype not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task subtype {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class TaskSubtypeRequest
    {
        public int CategoryId { get; set; }
        public string Name { get; set; } = "";
        public string? ColorHex { get; set; }
        public string? IconName { get; set; }
    }
}
