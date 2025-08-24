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
    [Authorize] // Require JWT authentication
    public class TaskTemplateController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TaskTemplateController> _logger;

        public TaskTemplateController(DBHelper dbHelper, ILogger<TaskTemplateController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        }

        /// <summary>
        /// Get all task templates for the current user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTaskTemplates()
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT id, user_id, title, description, is_deleted, created_on
                    FROM task_master
                    WHERE user_id = @userId AND is_deleted = false
                    ORDER BY created_on DESC";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTaskTemplateList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task templates");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Get specific task template by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskTemplate(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    SELECT id, user_id, title, description, is_deleted, created_on
                    FROM task_master
                    WHERE id = @id AND user_id = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId)
                };

                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return dt.Rows.Count == 0 ? NotFound() : Ok(DataRowToTaskTemplate(dt.Rows[0]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving task template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Create new task template
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateTaskTemplate([FromBody] TaskTemplate taskTemplate)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    INSERT INTO task_master (user_id, title, description, created_on)
                    VALUES (@userId, @title, @description, @createdOn)
                    RETURNING id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", userId),
                    new("@title", taskTemplate.Title),
                    new("@description", taskTemplate.Description ?? string.Empty),
                    new("@createdOn", DateTime.UtcNow)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                int templateId = Convert.ToInt32(newId);

                var createdTemplate = new
                {
                    Id = templateId,
                    UserId = userId,
                    taskTemplate.Title,
                    taskTemplate.Description,
                    IsDeleted = false,
                    CreatedOn = DateTime.UtcNow
                };

                return CreatedAtAction(
                    actionName: nameof(GetTaskTemplate),
                    routeValues: new { id = templateId },
                    value: createdTemplate
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task template");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update task template
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTaskTemplate(int id, [FromBody] TaskTemplate taskTemplate)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE task_master
                    SET title = @title, description = @description
                    WHERE id = @id AND user_id = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@id", id),
                    new("@userId", userId),
                    new("@title", taskTemplate.Title),
                    new("@description", taskTemplate.Description ?? string.Empty)
                };

                int affectedRows = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affectedRows == 0 ? NotFound() : Ok(new { UpdatedId = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating task template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft delete task template
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTaskTemplate(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                const string query = @"
                    UPDATE task_master
                    SET is_deleted = true
                    WHERE id = @id AND user_id = @userId AND is_deleted = false";

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
                _logger.LogError(ex, $"Error deleting task template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<TaskTemplate> DataTableToTaskTemplateList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTaskTemplate).ToList();
        }

        private TaskTemplate DataRowToTaskTemplate(DataRow row)
        {
            return new TaskTemplate
            {
                Id = Convert.ToInt32(row["id"]),
                UserId = Convert.ToInt32(row["user_id"]),
                Title = row["title"].ToString(),
                Description = row["description"].ToString(),
                IsDeleted = Convert.ToBoolean(row["is_deleted"]),
                CreatedOn = Convert.ToDateTime(row["created_on"])
            };
        }
        #endregion
    }
}
