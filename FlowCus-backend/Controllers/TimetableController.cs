using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Data;
using System.Security.Claims;

namespace FlowCus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        /// <summary>
        /// Get all timetables for current user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTimetables()
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT t.id, t.user_id, t.name, t.is_deleted, t.created_at,
                           COUNT(ti.id) as item_count
                    FROM timetables t
                    LEFT JOIN timetable_items ti ON t.id = ti.timetable_id AND ti.is_deleted = false
                    WHERE t.user_id = @userId AND t.is_deleted = false
                    GROUP BY t.id, t.user_id, t.name, t.is_deleted, t.created_at
                    ORDER BY t.created_at DESC";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTimetableList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving timetables");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get specific timetable by ID with its items
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTimetable(int id)
        {
            try
            {
                int userId = GetCurrentUserId();

                // Get timetable basic info
                const string timetableQuery = @"
                    SELECT id, user_id, name, is_deleted, created_at
                    FROM timetables
                    WHERE id = @id AND user_id = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId)
                };

                var timetableDt = await _dbHelper.GetTableAsync(timetableQuery, parameters);
                if (timetableDt.Rows.Count == 0)
                    return NotFound();

                var timetable = DataRowToTimetable(timetableDt.Rows[0]);

                // Get timetable items
                const string itemsQuery = @"
                    SELECT ti.id, ti.timetable_id, ti.task_master_id, ti.day_of_week,
                           ti.start_time, ti.end_time, ti.is_deleted,
                           tm.title as task_title, tm.description as task_description
                    FROM timetable_items ti
                    JOIN task_master tm ON ti.task_master_id = tm.id
                    WHERE ti.timetable_id = @timetableId AND ti.is_deleted = false
                    ORDER BY ti.day_of_week, ti.start_time";

                var itemsParams = new NpgsqlParameter[]
                {
                    new("@timetableId", id)
                };

                var itemsDt = await _dbHelper.GetTableAsync(itemsQuery, itemsParams);
                var items = DataTableToTimetableItemList(itemsDt);

                var result = new
                {
                    timetable.Id,
                    timetable.UserId,
                    timetable.Name,
                    timetable.IsDeleted,
                    timetable.CreatedAt,
                    Items = items
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving timetable {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Create new timetable
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTimetable([FromBody] Timetable timetable)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    INSERT INTO timetables (user_id, name, created_at)
                    VALUES (@userId, @name, @createdAt)
                    RETURNING id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", userId),
                    new("@name", timetable.Name),
                    new("@createdAt", DateTime.UtcNow)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                int timetableId = Convert.ToInt32(newId);

                var createdTimetable = new
                {
                    Id = timetableId,
                    UserId = userId,
                    timetable.Name,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow
                };

                return CreatedAtAction(
                    actionName: nameof(GetTimetable),
                    routeValues: new { id = timetableId },
                    value: createdTimetable
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating timetable");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update timetable name
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTimetable(int id, [FromBody] Timetable timetable)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE timetables
                    SET name = @name
                    WHERE id = @id AND user_id = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId),
                    new("@name", timetable.Name)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { UpdatedId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating timetable {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft delete timetable and all its items
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTimetable(int id)
        {
            try
            {
                int userId = GetCurrentUserId();

                var operations = new List<(string Query, NpgsqlParameter[] Parameters)>
                {
                    // Delete timetable items first
                    (@"UPDATE timetable_items SET is_deleted = true WHERE timetable_id = @id",
                     new NpgsqlParameter[] { new("@id", id) }),
                    
                    // Delete timetable
                    (@"UPDATE timetables SET is_deleted = true WHERE id = @id AND user_id = @userId AND is_deleted = false",
                     new NpgsqlParameter[] { new("@id", id), new("@userId", userId) })
                };

                await _dbHelper.ExecuteTransactionalQueriesAsync(operations);
                return Ok(new { DeletedId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting timetable {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get timetable schedule for a specific day
        /// </summary>
        [HttpGet("{id}/day/{dayOfWeek}")]
        public async Task<IActionResult> GetTimetableByDay(int id, int dayOfWeek)
        {
            try
            {
                int userId = GetCurrentUserId();

                if (dayOfWeek < 0 || dayOfWeek > 6)
                    return BadRequest("Day of week must be between 0 (Sunday) and 6 (Saturday)");

                const string query = @"
                    SELECT ti.id, ti.timetable_id, ti.task_master_id, ti.day_of_week,
                           ti.start_time, ti.end_time, ti.is_deleted,
                           tm.title as task_title, tm.description as task_description,
                           t.name as timetable_name
                    FROM timetable_items ti
                    JOIN task_master tm ON ti.task_master_id = tm.id
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.timetable_id = @timetableId 
                      AND t.user_id = @userId 
                      AND ti.day_of_week = @dayOfWeek 
                      AND ti.is_deleted = false 
                      AND t.is_deleted = false
                    ORDER BY ti.start_time";

                var parameters = new NpgsqlParameter[]
                {
                    new("@timetableId", id),
                    new("@userId", userId),
                    new("@dayOfWeek", dayOfWeek)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                var items = DataTableToTimetableItemList(dt);

                return Ok(new { DayOfWeek = dayOfWeek, Items = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving timetable {id} for day {dayOfWeek}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<Timetable> DataTableToTimetableList(DataTable dt)
        {
            return dt.AsEnumerable().Select(row => new Timetable
            {
                Id = Convert.ToInt32(row["id"]),
                UserId = Convert.ToInt32(row["user_id"]),
                Name = row["name"].ToString(),
                IsDeleted = Convert.ToBoolean(row["is_deleted"]),
                CreatedAt = Convert.ToDateTime(row["created_at"])
            }).ToList();
        }

        private Timetable DataRowToTimetable(DataRow row)
        {
            return new Timetable
            {
                Id = Convert.ToInt32(row["id"]),
                UserId = Convert.ToInt32(row["user_id"]),
                Name = row["name"].ToString(),
                IsDeleted = Convert.ToBoolean(row["is_deleted"]),
                CreatedAt = Convert.ToDateTime(row["created_at"])
            };
        }

        private List<TimetableItem> DataTableToTimetableItemList(DataTable dt)
        {
            return dt.AsEnumerable().Select(row => new TimetableItem
            {
                Id = Convert.ToInt32(row["id"]),
                TimetableId = Convert.ToInt32(row["timetable_id"]),
                TaskTemplateId = Convert.ToInt32(row["task_master_id"]),
                DayOfWeek = Convert.ToInt32(row["day_of_week"]),
                StartTime = (TimeSpan)row["start_time"],
                EndTime = (TimeSpan)row["end_time"],
                IsDeleted = Convert.ToBoolean(row["is_deleted"])
            }).ToList();
        }
        #endregion
    }
}