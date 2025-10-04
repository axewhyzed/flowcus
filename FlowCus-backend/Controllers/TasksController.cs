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
    public class TasksController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TasksController> _logger;

        public TasksController(DBHelper dbHelper, ILogger<TasksController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : throw new UnauthorizedAccessException("Invalid user ID");
        }

        // GET api/tasks
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    SELECT t.task_id, t.title, t.description, t.priority, t.created_on, t.updated_on,
                           t.start_time, t.end_time, t.duration_seconds,
                           t.task_category_id, tc.name AS category_name,
                           t.task_subtype_id, ts.name AS subtype_name
                    FROM tasks t
                    JOIN task_category tc ON t.task_category_id = tc.id
                    LEFT JOIN task_subtypes ts ON t.task_subtype_id = ts.id
                    WHERE t.created_by = @userId AND t.is_deleted = FALSE
                    ORDER BY t.created_on DESC";
                var p = new NpgsqlParameter("@userId", userId);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        TaskId = row["task_id"],
                        Title = row["title"],
                        Description = row["description"],
                        Priority = row["priority"],
                        CreatedOn = row["created_on"],
                        UpdatedOn = row["updated_on"],
                        StartTime = row["start_time"],
                        EndTime = row["end_time"],
                        DurationSeconds = row["duration_seconds"],
                        TaskCategoryId = row["task_category_id"],
                        CategoryName = row["category_name"],
                        TaskSubtypeId = row["task_subtype_id"] == DBNull.Value ? null : (int?)row["task_subtype_id"],
                        SubtypeName = row["subtype_name"] == DBNull.Value ? null : row["subtype_name"].ToString()
                    });
                }

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tasks");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // GET api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = @"
                    SELECT t.task_id, t.title, t.description, t.priority, t.created_on, t.updated_on,
                           t.start_time, t.end_time, t.duration_seconds,
                           t.task_category_id, tc.name AS category_name,
                           t.task_subtype_id, ts.name AS subtype_name
                    FROM tasks t
                    JOIN task_category tc ON t.task_category_id = tc.id
                    LEFT JOIN task_subtypes ts ON t.task_subtype_id = ts.id
                    WHERE t.task_id = @id AND t.created_by = @userId AND t.is_deleted = FALSE";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                var dt = await _dbHelper.GetTableAsync(sql, p1, p2);
                if (dt.Rows.Count == 0)
                    return NotFound(new { error = "Task not found" });

                var row = dt.Rows[0];
                return Ok(new
                {
                    TaskId = row["task_id"],
                    Title = row["title"],
                    Description = row["description"],
                    Priority = row["priority"],
                    CreatedOn = row["created_on"],
                    UpdatedOn = row["updated_on"],
                    StartTime = row["start_time"],
                    EndTime = row["end_time"],
                    DurationSeconds = row["duration_seconds"],
                    TaskCategoryId = row["task_category_id"],
                    CategoryName = row["category_name"],
                    TaskSubtypeId = row["task_subtype_id"] == DBNull.Value ? null : (int?)row["task_subtype_id"],
                    SubtypeName = row["subtype_name"] == DBNull.Value ? null : row["subtype_name"].ToString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // POST api/tasks
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskEntityRequest request)
        {
            if (request.TaskCategoryId <= 0 || string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { error = "Category and title are required" });

            try
            {
                int userId = GetCurrentUserId();

                string sql = @"
                    INSERT INTO tasks
                    (task_category_id, task_subtype_id, title, description, priority, created_on, created_by, start_time, end_time, duration_seconds)
                    VALUES
                    (@catId, @subtypeId, @title, @desc, @priority, now(), @createdBy, @startTime, @endTime, @durationSeconds)
                    RETURNING task_id";

                var p = new[]
                {
                    new NpgsqlParameter("@catId", request.TaskCategoryId),
                    new NpgsqlParameter("@subtypeId", (object?)request.TaskSubtypeId ?? DBNull.Value),
                    new NpgsqlParameter("@title", request.Title),
                    new NpgsqlParameter("@desc", (object?)request.Description ?? DBNull.Value),
                    new NpgsqlParameter("@priority", (object?)request.Priority ?? DBNull.Value),
                    new NpgsqlParameter("@createdBy", userId),
                    new NpgsqlParameter("@startTime", (object?)request.StartTime ?? DBNull.Value),
                    new NpgsqlParameter("@endTime", (object?)request.EndTime ?? DBNull.Value),
                    new NpgsqlParameter("@durationSeconds", (object?)request.DurationSeconds ?? DBNull.Value)
                };

                object? res = await _dbHelper.GetValueAsync(sql, p);
                if (res == null)
                    return StatusCode(500, new { error = "Could not create task" });

                return CreatedAtAction(nameof(Get), new { id = Convert.ToInt32(res) }, new { id = res });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/tasks/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskEntityRequest request)
        {
            if (request.TaskCategoryId <= 0 || string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { error = "Category and title are required" });

            try
            {
                int userId = GetCurrentUserId();

                string sql = @"
                    UPDATE tasks
                    SET task_category_id = @catId,
                        task_subtype_id = @subtypeId,
                        title = @title,
                        description = @desc,
                        priority = @priority,
                        updated_on = now(),
                        start_time = @startTime,
                        end_time = @endTime,
                        duration_seconds = @durationSeconds
                    WHERE task_id = @id AND created_by = @userId AND is_deleted = FALSE";

                var p = new[]
                {
                    new NpgsqlParameter("@catId", request.TaskCategoryId),
                    new NpgsqlParameter("@subtypeId", (object?)request.TaskSubtypeId ?? DBNull.Value),
                    new NpgsqlParameter("@title", request.Title),
                    new NpgsqlParameter("@desc", (object?)request.Description ?? DBNull.Value),
                    new NpgsqlParameter("@priority", (object?)request.Priority ?? DBNull.Value),
                    new NpgsqlParameter("@startTime", (object?)request.StartTime ?? DBNull.Value),
                    new NpgsqlParameter("@endTime", (object?)request.EndTime ?? DBNull.Value),
                    new NpgsqlParameter("@durationSeconds", (object?)request.DurationSeconds ?? DBNull.Value),
                    new NpgsqlParameter("@id", id),
                    new NpgsqlParameter("@userId", userId)
                };

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p);
                if (rows == 1)
                    return Ok(new { message = "Task updated successfully" });

                return NotFound(new { error = "Task not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // DELETE api/tasks/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                string sql = "UPDATE tasks SET is_deleted = TRUE WHERE task_id = @id AND created_by = @userId";
                var p1 = new NpgsqlParameter("@id", id);
                var p2 = new NpgsqlParameter("@userId", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2);
                if (rows == 1)
                    return Ok(new { message = "Task deleted successfully" });

                return NotFound(new { error = "Task not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class TaskEntityRequest
    {
        public int TaskCategoryId { get; set; }
        public int? TaskSubtypeId { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public int? Priority { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int? DurationSeconds { get; set; }
    }
}
