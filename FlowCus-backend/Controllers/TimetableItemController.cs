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
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        /// <summary>
        /// Get all timetable items for a specific timetable
        /// </summary>
        [HttpGet("timetable/{timetableId}")]
        public async Task<IActionResult> GetTimetableItems(int timetableId)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT ti.id, ti.timetable_id, ti.task_master_id, ti.day_of_week,
                           ti.start_time, ti.end_time, ti.is_deleted,
                           tm.title as task_title, tm.description as task_description
                    FROM timetable_items ti
                    JOIN task_master tm ON ti.task_master_id = tm.id
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.timetable_id = @timetableId 
                      AND t.user_id = @userId 
                      AND ti.is_deleted = false 
                      AND t.is_deleted = false
                    ORDER BY ti.day_of_week, ti.start_time";

                var parameters = new NpgsqlParameter[]
                {
                    new("@timetableId", timetableId),
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTimetableItemList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving timetable items for timetable {timetableId}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get specific timetable item by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTimetableItem(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT ti.id, ti.timetable_id, ti.task_master_id, ti.day_of_week,
                           ti.start_time, ti.end_time, ti.is_deleted,
                           tm.title as task_title, tm.description as task_description
                    FROM timetable_items ti
                    JOIN task_master tm ON ti.task_master_id = tm.id
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.id = @id 
                      AND t.user_id = @userId 
                      AND ti.is_deleted = false 
                      AND t.is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return dt.Rows.Count == 0 ? NotFound() : Ok(DataRowToTimetableItem(dt.Rows[0]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving timetable item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Create new timetable item
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTimetableItem([FromBody] TimetableItem item)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();

                // Validate that user owns the timetable
                const string validateQuery = @"
                    SELECT COUNT(*) FROM timetables 
                    WHERE id = @timetableId AND user_id = @userId AND is_deleted = false";

                var validateParams = new NpgsqlParameter[]
                {
                    new("@timetableId", item.TimetableId),
                    new("@userId", userId)
                };

                var count = await _dbHelper.GetValueAsync(validateQuery, validateParams);
                if (Convert.ToInt32(count) == 0)
                    return BadRequest("Invalid timetable or access denied");

                // Validate that user owns the task template
                const string validateTaskQuery = @"
                    SELECT COUNT(*) FROM task_master 
                    WHERE id = @taskTemplateId AND user_id = @userId AND is_deleted = false";

                var validateTaskParams = new NpgsqlParameter[]
                {
                    new("@taskTemplateId", item.TaskTemplateId),
                    new("@userId", userId)
                };

                var taskCount = await _dbHelper.GetValueAsync(validateTaskQuery, validateTaskParams);
                if (Convert.ToInt32(taskCount) == 0)
                    return BadRequest("Invalid task template or access denied");

                // Check for time conflicts
                const string conflictQuery = @"
                    SELECT COUNT(*) FROM timetable_items ti
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.timetable_id = @timetableId 
                      AND ti.day_of_week = @dayOfWeek 
                      AND ti.is_deleted = false
                      AND t.user_id = @userId
                      AND (
                        (@startTime >= ti.start_time AND @startTime < ti.end_time) OR
                        (@endTime > ti.start_time AND @endTime <= ti.end_time) OR
                        (@startTime <= ti.start_time AND @endTime >= ti.end_time)
                      )";

                var conflictParams = new NpgsqlParameter[]
                {
                    new("@timetableId", item.TimetableId),
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime),
                    new("@userId", userId)
                };

                var conflicts = await _dbHelper.GetValueAsync(conflictQuery, conflictParams);
                if (Convert.ToInt32(conflicts) > 0)
                    return BadRequest("Time slot conflicts with existing timetable item");

                // Create the item
                const string query = @"
                    INSERT INTO timetable_items (timetable_id, task_master_id, day_of_week, start_time, end_time)
                    VALUES (@timetableId, @taskMasterId, @dayOfWeek, @startTime, @endTime)
                    RETURNING id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@timetableId", item.TimetableId),
                    new("@taskMasterId", item.TaskTemplateId),
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                int itemId = Convert.ToInt32(newId);

                return CreatedAtAction(
                    actionName: nameof(GetTimetableItem),
                    routeValues: new { id = itemId },
                    value: new { Id = itemId }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating timetable item");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update timetable item
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTimetableItem(int id, [FromBody] TimetableItem item)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();

                // Check for time conflicts (excluding current item)
                const string conflictQuery = @"
                    SELECT COUNT(*) FROM timetable_items ti
                    JOIN timetables t ON ti.timetable_id = t.id
                    WHERE ti.timetable_id = @timetableId 
                      AND ti.day_of_week = @dayOfWeek 
                      AND ti.id != @itemId
                      AND ti.is_deleted = false
                      AND t.user_id = @userId
                      AND (
                        (@startTime >= ti.start_time AND @startTime < ti.end_time) OR
                        (@endTime > ti.start_time AND @endTime <= ti.end_time) OR
                        (@startTime <= ti.start_time AND @endTime >= ti.end_time)
                      )";

                var conflictParams = new NpgsqlParameter[]
                {
                    new("@timetableId", item.TimetableId),
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime),
                    new("@itemId", id),
                    new("@userId", userId)
                };

                var conflicts = await _dbHelper.GetValueAsync(conflictQuery, conflictParams);
                if (Convert.ToInt32(conflicts) > 0)
                    return BadRequest("Time slot conflicts with existing timetable item");

                const string query = @"
                    UPDATE timetable_items 
                    SET task_master_id = @taskMasterId, day_of_week = @dayOfWeek, 
                        start_time = @startTime, end_time = @endTime
                    FROM timetables t
                    WHERE timetable_items.id = @id 
                      AND timetable_items.timetable_id = t.id
                      AND t.user_id = @userId 
                      AND timetable_items.is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@taskMasterId", item.TaskTemplateId),
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime),
                    new("@userId", userId)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { UpdatedId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating timetable item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft delete timetable item
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTimetableItem(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE timetable_items 
                    SET is_deleted = true
                    FROM timetables t
                    WHERE timetable_items.id = @id 
                      AND timetable_items.timetable_id = t.id
                      AND t.user_id = @userId 
                      AND timetable_items.is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { DeletedId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting timetable item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<TimetableItem> DataTableToTimetableItemList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTimetableItem).ToList();
        }

        private TimetableItem DataRowToTimetableItem(DataRow row)
        {
            return new TimetableItem
            {
                Id = Convert.ToInt32(row["id"]),
                TimetableId = Convert.ToInt32(row["timetable_id"]),
                TaskTemplateId = Convert.ToInt32(row["task_master_id"]),
                DayOfWeek = Convert.ToInt32(row["day_of_week"]),
                StartTime = (TimeSpan)row["start_time"],
                EndTime = (TimeSpan)row["end_time"],
                IsDeleted = Convert.ToBoolean(row["is_deleted"])
            };
        }
        #endregion
    }
}