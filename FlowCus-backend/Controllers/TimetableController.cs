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
    public class TimetableController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TimetableController> _logger;

        public TimetableController(DBHelper dbHelper, ILogger<TimetableController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : throw new UnauthorizedAccessException("Invalid user ID");
        }

        // GET api/timetable
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = "SELECT id, name, is_active, created_at FROM timetables WHERE user_id = @userId AND is_deleted = FALSE ORDER BY created_at DESC";
                var p = new NpgsqlParameter("@userId", userId);

                var dt = await _dbHelper.GetTableAsync(sql, p);
                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        Id = row["id"],
                        Name = row["name"],
                        IsActive = row["is_active"],
                        CreatedAt = row["created_at"]
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching timetables");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/timetable/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = "SELECT id, name, is_active, created_at FROM timetables WHERE id = @id AND user_id = @userId AND is_deleted = FALSE";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                var dt = await _dbHelper.GetTableAsync(sql, p1, p2);
                if (dt.Rows.Count == 0)
                    return NotFound(new { error = "Timetable not found" });

                var row = dt.Rows[0];
                return Ok(new
                {
                    Id = row["id"],
                    Name = row["name"],
                    IsActive = row["is_active"],
                    CreatedAt = row["created_at"]
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching timetable {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/timetable
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TimetableRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name is required" });

            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    INSERT INTO timetables (user_id, name, is_active, created_at)
                    VALUES (@userId, @name, @isActive, now())
                    RETURNING id";
                var p = new[]
                {
                    new NpgsqlParameter("@userId", userId),
                    new NpgsqlParameter("@name", request.Name),
                    new NpgsqlParameter("@isActive", request.IsActive)
                };

                // If setting active, deactivate others
                if (request.IsActive)
                {
                    string deactivateSql = "UPDATE timetables SET is_active = FALSE WHERE user_id = @userId";
                    await _dbHelper.ExecuteQueryAsync(deactivateSql, new NpgsqlParameter("@userId", userId));
                }

                object? res = await _dbHelper.GetValueAsync(sql, p);
                if (res == null)
                    return StatusCode(500, new { error = "Could not create timetable" });

                return CreatedAtAction(nameof(Get), new { id = Convert.ToInt32(res) }, new { id = res });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating timetable");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/timetable/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TimetableRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name is required" });

            try
            {
                int userId = GetCurrentUserId();

                // If activating, deactivate others
                if (request.IsActive)
                {
                    string deactivateSql = "UPDATE timetables SET is_active = FALSE WHERE user_id = @userId";
                    await _dbHelper.ExecuteQueryAsync(deactivateSql, new NpgsqlParameter("@userId", userId));
                }

                string sql = @"
                    UPDATE timetables
                    SET name = @name,
                        is_active = @isActive
                    WHERE id = @id AND user_id = @userId AND is_deleted = FALSE";

                var p = new[]
                {
                    new NpgsqlParameter("@name", request.Name),
                    new NpgsqlParameter("@isActive", request.IsActive),
                    new NpgsqlParameter("@id", id),
                    new NpgsqlParameter("@userId", userId)
                };

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p);
                if (rows == 1)
                    return Ok(new { message = "Timetable updated successfully" });

                return NotFound(new { error = "Timetable not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating timetable {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/timetable/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = "UPDATE timetables SET is_deleted = TRUE WHERE id = @id AND user_id = @userId";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2);
                if (rows == 1)
                    return Ok(new { message = "Timetable deleted successfully" });

                return NotFound(new { error = "Timetable not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting timetable {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class TimetableRequest
    {
        public string Name { get; set; } = "";
        public bool IsActive { get; set; } = false;
    }
}
