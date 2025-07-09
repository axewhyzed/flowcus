// TasksController.cs
using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Data;

namespace FlowCus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TasksController> _logger;

        public TasksController(DBHelper dbHelper, ILogger<TasksController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves all active tasks
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTasks()
        {
            try
            {
                const string query = @"
                    SELECT task_id, title, description, priority, created_on, created_by, updated_on, updated_by,
                        start_time, end_time, duration_seconds, is_deleted, isCompleted
                    FROM tasks
                    WHERE is_deleted = false";

                var dt = await _dbHelper.GetTableAsync(query);
                return Ok(DataTableToTaskList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Gets a specific task by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(int id)
        {
            try
            {
                const string query = @"
                    SELECT task_id, title, description, priority, created_on, created_by, updated_on, updated_by,
                        start_time, end_time, duration_seconds, is_deleted, isCompleted
                    FROM tasks
                    WHERE task_id = @id AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new NpgsqlParameter("@id", id)
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
        /// Creates a new task
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> PostTask([FromBody] Models.Task task)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                task.CalculateDuration();

                const string query = @"
                    INSERT INTO tasks (
                        title, description, priority, created_on, created_by,
                        start_time, end_time, duration_seconds, is_deleted, isCompleted
                    )
                    VALUES (
                        @title, @description, @priority, @createdOn, @createdBy,
                        @startTime, @endTime, @durationSeconds, @isDeleted, @isCompleted
                    )
                    RETURNING task_id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@title", task.Title),
                    new("@description", task.Description ?? string.Empty),
                    new("@priority", task.Priority),
                    new("@createdOn", DateTime.UtcNow),
                    new("@createdBy", task.CreatedBy),
                    new("@startTime", task.StartTime ?? (object)DBNull.Value),
                    new("@endTime", task.EndTime ?? (object)DBNull.Value),
                    new("@durationSeconds", task.DurationSeconds ?? (object)DBNull.Value),
                    new("@isDeleted", false),
                    new("@isCompleted", false)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                int taskId = Convert.ToInt32(newId);

                // Return the full object in response
                var createdTask = new
                {
                    TaskId = taskId,
                    task.Title,
                    task.Description,
                    task.Priority,
                    CreatedOn = DateTime.UtcNow,
                    task.CreatedBy,
                    task.StartTime,
                    task.EndTime,
                    task.DurationSeconds,
                    IsDeleted = false,
                    IsCompleted = false
                };

                return CreatedAtAction(
                    actionName: nameof(GetTask),
                    routeValues: new { id = taskId },
                    value: createdTask
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Updates an existing task. Supports partial updates for fields like title,
        /// isCompleted, or soft deletion. Returns updated task ID.
        /// </summary>
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] FlowCus.Models.Task task)
        {
            try
            {
                var existing = await GetTask(id) as OkObjectResult;
                if (existing == null) return NotFound();

                task.CalculateDuration();

                const string query = @"
                    SELECT fn_update_task(
                        @task_id,
                        @title,
                        @description,
                        @priority,
                        @updated_by,
                        @start_time,
                        @end_time,
                        @duration_seconds,
                        @is_completed,
                        @is_deleted
                    )";

                var parameters = new[]
                {
                    new NpgsqlParameter("@task_id", id),
                    new NpgsqlParameter("@title", (object?)task.Title ?? DBNull.Value),
                    new NpgsqlParameter("@description", (object?)task.Description ?? DBNull.Value),
                    new NpgsqlParameter("@priority", (object?)task.Priority ?? DBNull.Value),
                    new NpgsqlParameter("@updated_by", (object?)task.UpdatedBy ?? DBNull.Value),
                    new NpgsqlParameter("@start_time", (object?)task.StartTime ?? DBNull.Value),
                    new NpgsqlParameter("@end_time", (object?)task.EndTime ?? DBNull.Value),
                    new NpgsqlParameter("@duration_seconds", (object?)task.DurationSeconds ?? DBNull.Value),
                    new NpgsqlParameter("@is_completed", (object?)task.IsCompleted ?? DBNull.Value),
                    new NpgsqlParameter("@is_deleted", (object?)task.IsDeleted ?? DBNull.Value)
                };

                var result = await _dbHelper.GetValueAsync(query, parameters);
                var updatedId = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);

                return Ok(new { UpdatedTaskId = updatedId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating task {id}");
                return StatusCode(500, "Internal server error");
            }
        }


        #region Helpers
        private List<Models.Task> DataTableToTaskList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTask).ToList();
        }

        private Models.Task DataRowToTask(DataRow row)
        {
            return new Models.Task
            {
                TaskId = Convert.ToInt32(row["task_id"]),
                Title = row["title"].ToString(),
                Description = row["description"].ToString(),
                Priority = Convert.ToInt32(row["priority"]),
                CreatedOn = Convert.ToDateTime(row["created_on"]),
                CreatedBy = Convert.ToInt32(row["created_by"]),
                UpdatedOn = row["updated_on"] as DateTime?,
                UpdatedBy = row["updated_by"] as int?,
                StartTime = row["start_time"] as DateTime?,
                EndTime = row["end_time"] as DateTime?,
                DurationSeconds = row["duration_seconds"] as int?,
                IsDeleted = Convert.ToBoolean(row["is_deleted"]),
                IsCompleted = Convert.ToBoolean(row["isCompleted"])
            };
        }
        #endregion
    }
}