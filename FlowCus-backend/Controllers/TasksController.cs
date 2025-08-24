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
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        /// <summary>
        /// Get all tasks for current user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTasks()
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT t.task_id, t.task_master_id, t.title, t.description, t.priority,
                           t.created_on, t.created_by, t.updated_on, t.updated_by,
                           t.start_time, t.end_time, t.duration_seconds, t.is_deleted,
                           tm.title as template_title
                    FROM tasks t
                    LEFT JOIN task_master tm ON t.task_master_id = tm.id
                    WHERE t.created_by = @userId AND t.is_deleted = false
                    ORDER BY t.created_on DESC";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTaskList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get specific task by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT t.task_id, t.task_master_id, t.title, t.description, t.priority,
                           t.created_on, t.created_by, t.updated_on, t.updated_by,
                           t.start_time, t.end_time, t.duration_seconds, t.is_deleted,
                           tm.title as template_title
                    FROM tasks t
                    LEFT JOIN task_master tm ON t.task_master_id = tm.id
                    WHERE t.task_id = @id AND t.created_by = @userId AND t.is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return dt.Rows.Count == 0 ? NotFound() : Ok(DataRowToTask(dt.Rows[0]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving task {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Create new task
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] TaskEntity task)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    INSERT INTO tasks (
                        task_master_id, title, description, priority, created_on, created_by,
                        start_time, end_time, duration_seconds
                    )
                    VALUES (
                        @taskMasterId, @title, @description, @priority, @createdOn, @createdBy,
                        @startTime, @endTime, @durationSeconds
                    )
                    RETURNING task_id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@taskMasterId", task.TaskTemplateId),
                    new("@title", task.Title),
                    new("@description", task.Description ?? string.Empty),
                    new("@priority", task.Priority ?? (object)DBNull.Value),
                    new("@createdOn", DateTime.UtcNow),
                    new("@createdBy", userId),
                    new("@startTime", task.StartTime ?? (object)DBNull.Value),
                    new("@endTime", task.EndTime ?? (object)DBNull.Value),
                    new("@durationSeconds", task.DurationSeconds ?? (object)DBNull.Value)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                int taskId = Convert.ToInt32(newId);

                return CreatedAtAction(
                    actionName: nameof(GetTask),
                    routeValues: new { id = taskId },
                    value: new { TaskId = taskId }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update existing task
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] TaskEntity task)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE tasks
                    SET title = @title, description = @description, priority = @priority,
                        updated_on = @updatedOn, updated_by = @updatedBy,
                        start_time = @startTime, end_time = @endTime, duration_seconds = @durationSeconds
                    WHERE task_id = @id AND created_by = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId),
                    new("@title", task.Title),
                    new("@description", task.Description ?? string.Empty),
                    new("@priority", task.Priority ?? (object)DBNull.Value),
                    new("@updatedOn", DateTime.UtcNow),
                    new("@updatedBy", userId),
                    new("@startTime", task.StartTime ?? (object)DBNull.Value),
                    new("@endTime", task.EndTime ?? (object)DBNull.Value),
                    new("@durationSeconds", task.DurationSeconds ?? (object)DBNull.Value)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { UpdatedTaskId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating task {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft delete task
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE tasks
                    SET is_deleted = true, updated_on = @updatedOn, updated_by = @updatedBy
                    WHERE task_id = @id AND created_by = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId),
                    new("@updatedOn", DateTime.UtcNow),
                    new("@updatedBy", userId)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { DeletedTaskId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting task {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<TaskEntity> DataTableToTaskList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTask).ToList();
        }

        private TaskEntity DataRowToTask(DataRow row)
        {
            return new TaskEntity
            {
                TaskId = Convert.ToInt32(row["task_id"]),
                TaskTemplateId = Convert.ToInt32(row["task_master_id"]),
                Title = row["title"].ToString(),
                Description = row["description"].ToString(),
                Priority = row["priority"] as int?,
                CreatedOn = Convert.ToDateTime(row["created_on"]),
                CreatedBy = Convert.ToInt32(row["created_by"]),
                UpdatedOn = row["updated_on"] as DateTime?,
                UpdatedBy = row["updated_by"] as int?,
                StartTime = row["start_time"] as DateTime?,
                EndTime = row["end_time"] as DateTime?,
                DurationSeconds = row["duration_seconds"] as int?,
                IsDeleted = Convert.ToBoolean(row["is_deleted"])
            };
        }
        #endregion
    }
}