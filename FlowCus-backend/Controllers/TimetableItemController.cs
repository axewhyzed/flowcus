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
    public class TimetableItemController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TimetableItemController> _logger;

        public TimetableItemController(DBHelper dbHelper, ILogger<TimetableItemController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : throw new UnauthorizedAccessException("Invalid user ID");
        }

        // GET api/timetableitems/{timetableId}
        [HttpGet("{timetableId}")]
        public async Task<IActionResult> GetAll(int timetableId)
        {
            try
            {
                int userId = GetCurrentUserId();

                string sql = @"
                    SELECT ti.id, ti.task_category_id, ti.task_subtype_id, ti.day_of_week, ti.start_time, ti.end_time,
                           tc.name AS category_name, ts.name AS subtype_name
                    FROM timetable_items ti
                    JOIN timetables t ON ti.timetable_id = t.id
                    JOIN task_category tc ON ti.task_category_id = tc.id
                    LEFT JOIN task_subtypes ts ON ti.task_subtype_id = ts.id
                    WHERE ti.timetable_id = @timetableId AND t.user_id = @userId AND ti.is_deleted = FALSE
                    ORDER BY ti.day_of_week, ti.start_time";

                var p1 = new NpgsqlParameter("@timetableId", timetableId);
                var p2 = new NpgsqlParameter("@userId", userId);

                var dt = await _dbHelper.GetTableAsync(sql, p1, p2);
                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        Id = row["id"],
                        TaskCategoryId = row["task_category_id"],
                        CategoryName = row["category_name"],
                        TaskSubtypeId = row["task_subtype_id"],
                        SubtypeName = row["subtype_name"],
                        DayOfWeek = row["day_of_week"],
                        StartTime = row["start_time"],
                        EndTime = row["end_time"]
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching timetable items for timetable {TimetableId}", timetableId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/timetableitems
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TimetableItemRequest request)
        {
            if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
                return BadRequest(new { error = "Invalid day_of_week. Must be 0 (Sunday) to 6 (Saturday)." });

            try
            {
                int userId = GetCurrentUserId();

                // Ensure timetable belongs to user
                string checkSql = "SELECT COUNT(1) FROM timetables WHERE id = @timetableId AND user_id = @userId AND is_deleted = FALSE";
                var check = await _dbHelper.GetValueAsync(checkSql,
                    new NpgsqlParameter("@timetableId", request.TimetableId),
                    new NpgsqlParameter("@userId", userId));
                if (Convert.ToInt32(check) == 0)
                    return NotFound(new { error = "Timetable not found or not owned by user" });

                string sql = @"
                    INSERT INTO timetable_items
                    (timetable_id, task_category_id, task_subtype_id, day_of_week, start_time, end_time)
                    VALUES (@timetableId, @categoryId, @subtypeId, @dayOfWeek, @startTime, @endTime)
                    RETURNING id";

                var p = new[]
                {
                    new NpgsqlParameter("@timetableId", request.TimetableId),
                    new NpgsqlParameter("@categoryId", request.TaskCategoryId),
                    new NpgsqlParameter("@subtypeId", request.TaskSubtypeId.HasValue ? (object)request.TaskSubtypeId.Value : DBNull.Value),
                    new NpgsqlParameter("@dayOfWeek", request.DayOfWeek),
                    new NpgsqlParameter("@startTime", request.StartTime),
                    new NpgsqlParameter("@endTime", request.EndTime)
                };

                object? res = await _dbHelper.GetValueAsync(sql, p);
                if (res == null)
                    return StatusCode(500, new { error = "Could not create timetable item" });

                return CreatedAtAction(nameof(GetAll), new { timetableId = request.TimetableId }, new { id = res });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating timetable item");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/timetableitems/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TimetableItemRequest request)
        {
            if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
                return BadRequest(new { error = "Invalid day_of_week. Must be 0 (Sunday) to 6 (Saturday)." });

            try
            {
                int userId = GetCurrentUserId();

                // Verify ownership
                string verifySql = @"
                    SELECT COUNT(1)
                    FROM timetable_items ti
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.id = @id AND t.user_id = @userId AND ti.is_deleted = FALSE";
                var verify = await _dbHelper.GetValueAsync(verifySql,
                    new NpgsqlParameter("@id", id),
                    new NpgsqlParameter("@userId", userId));
                if (Convert.ToInt32(verify) == 0)
                    return NotFound(new { error = "Timetable item not found or not owned by user" });

                string sql = @"
                    UPDATE timetable_items
                    SET task_category_id = @categoryId,
                        task_subtype_id = @subtypeId,
                        day_of_week = @dayOfWeek,
                        start_time = @startTime,
                        end_time = @endTime
                    WHERE id = @id";

                var p = new[]
                {
                    new NpgsqlParameter("@categoryId", request.TaskCategoryId),
                    new NpgsqlParameter("@subtypeId", request.TaskSubtypeId.HasValue ? (object)request.TaskSubtypeId.Value : DBNull.Value),
                    new NpgsqlParameter("@dayOfWeek", request.DayOfWeek),
                    new NpgsqlParameter("@startTime", request.StartTime),
                    new NpgsqlParameter("@endTime", request.EndTime),
                    new NpgsqlParameter("@id", id)
                };

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p);
                if (rows == 1)
                    return Ok(new { message = "Timetable item updated successfully" });

                return NotFound(new { error = "Timetable item not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating timetable item {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/timetableitems/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                int userId = GetCurrentUserId();

                string sql = @"
                    UPDATE timetable_items
                    SET is_deleted = TRUE
                    WHERE id = @id
                    AND timetable_id IN (SELECT id FROM timetables WHERE user_id = @userId)";

                int rows = await _dbHelper.ExecuteQueryAsync(sql,
                    new NpgsqlParameter("@id", id),
                    new NpgsqlParameter("@userId", userId));

                if (rows == 1)
                    return Ok(new { message = "Timetable item deleted successfully" });

                return NotFound(new { error = "Timetable item not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting timetable item {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class TimetableItemRequest
    {
        public int TimetableId { get; set; }
        public int TaskCategoryId { get; set; }
        public int? TaskSubtypeId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }
}
