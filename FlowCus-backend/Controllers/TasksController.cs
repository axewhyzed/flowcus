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
                        start_time, end_time, duration_seconds, is_deleted
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
                    SELECT task_id, title, description, priority, created_on, created_by,
                        start_time, end_time, duration_seconds, is_deleted
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
                        start_time, end_time, duration_seconds, is_deleted
                    )
                    VALUES (
                        @title, @description, @priority, @createdOn, @createdBy,
                        @startTime, @endTime, @durationSeconds, @isDeleted
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
                    new("@isDeleted", false)
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
                    IsDeleted = false
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
        /// Updates an existing task
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTask(int id, [FromBody] Models.Task task)
        {
            try
            {
                // Verify existence first
                var existing = await GetTask(id) as OkObjectResult;
                if (existing == null) return NotFound();

                task.CalculateDuration();

                const string query = @"
                    UPDATE tasks SET
                        title = @title,
                        description = @description,
                        priority = @priority,
                        updated_on = @updatedOn,
                        updated_by = @updatedBy,
                        start_time = @startTime,
                        end_time = @endTime,
                        duration_seconds = @durationSeconds
                    WHERE task_id = @id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@title", task.Title),
                    new("@description", task.Description ?? string.Empty),
                    new("@priority", task.Priority),
                    new("@updatedOn", DateTime.UtcNow),
                    new("@updatedBy", task.UpdatedBy),
                    new("@startTime", task.StartTime ?? (object)DBNull.Value),
                    new("@endTime", task.EndTime ?? (object)DBNull.Value),
                    new("@durationSeconds", task.DurationSeconds ?? (object)DBNull.Value),
                    new("@id", id)
                };

                await _dbHelper.ExecuteQueryAsync(query, parameters);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating task {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft deletes a task
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            try
            {
                const string query = @"
                    UPDATE tasks 
                    SET is_deleted = true 
                    WHERE task_id = @id";

                var parameters = new NpgsqlParameter[] { new("@id", id) };
                int affected = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affected == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting task {id}");
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
                IsDeleted = Convert.ToBoolean(row["is_deleted"])
            };
        }
        #endregion
    }
}