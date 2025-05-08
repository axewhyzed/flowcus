// TemplateItemsController.cs
using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Data;

namespace FlowCus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplateItemsController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TemplateItemsController> _logger;

        public TemplateItemsController(DBHelper dbHelper, ILogger<TemplateItemsController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        /// <summary>
        /// Gets all items in a template
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTemplateItems(int templateId)
        {
            try
            {
                const string query = @"
                    SELECT Id, TemplateId, DayOfWeek, StartTime, EndTime, 
                           TaskTitle, TaskDescription, IsDeleted
                    FROM TemplateItems
                    WHERE TemplateId = @templateId AND IsDeleted = false";

                var parameters = new NpgsqlParameter[] { new("@templateId", templateId) };
                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTemplateItemList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving items for template {templateId}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Gets a specific template item by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplateItem(int id)
        {
            try
            {
                const string query = @"
                    SELECT Id, TemplateId, DayOfWeek, StartTime, EndTime, 
                           TaskTitle, TaskDescription, IsDeleted
                    FROM TemplateItems
                    WHERE Id = @id AND IsDeleted = false";

                var parameters = new NpgsqlParameter[] { new("@id", id) };
                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return dt.Rows.Count == 0 ? NotFound() : Ok(DataRowToTemplateItem(dt.Rows[0]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving template item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Adds a new item to a template
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> PostTemplateItem([FromBody] TemplateItem item)
        {
            try
            {
                const string query = @"
                    INSERT INTO TemplateItems (
                        TemplateId, DayOfWeek, StartTime, EndTime, 
                        TaskTitle, TaskDescription, IsDeleted
                    )
                    VALUES (
                        @templateId, @dayOfWeek, @startTime, @endTime,
                        @taskTitle, @taskDescription, @isDeleted
                    )
                    RETURNING Id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@templateId", item.TemplateId),
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime),
                    new("@taskTitle", item.TaskTitle),
                    new("@taskDescription", item.TaskDescription ?? string.Empty),
                    new("@isDeleted", false)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                return CreatedAtAction(nameof(GetTemplateItem), new { id = newId }, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating template item");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Updates a template item
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTemplateItem(int id, [FromBody] TemplateItem item)
        {
            try
            {
                // Verify existence first
                var existing = await GetTemplateItem(id) as OkObjectResult;
                if (existing == null) return NotFound();

                const string query = @"
                    UPDATE TemplateItems SET
                        DayOfWeek = @dayOfWeek,
                        StartTime = @startTime,
                        EndTime = @endTime,
                        TaskTitle = @taskTitle,
                        TaskDescription = @taskDescription
                    WHERE Id = @id AND IsDeleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@dayOfWeek", item.DayOfWeek),
                    new("@startTime", item.StartTime),
                    new("@endTime", item.EndTime),
                    new("@taskTitle", item.TaskTitle),
                    new("@taskDescription", item.TaskDescription ?? string.Empty),
                    new("@id", id)
                };

                await _dbHelper.ExecuteQueryAsync(query, parameters);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating template item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft deletes a template item
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTemplateItem(int id)
        {
            try
            {
                const string query = @"
                    UPDATE TemplateItems 
                    SET IsDeleted = true 
                    WHERE Id = @id";

                var parameters = new NpgsqlParameter[] { new("@id", id) };
                int affected = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affected == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting template item {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<TemplateItem> DataTableToTemplateItemList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTemplateItem).ToList();
        }

        private TemplateItem DataRowToTemplateItem(DataRow row)
        {
            return new TemplateItem
            {
                Id = Convert.ToInt32(row["Id"]),
                TemplateId = Convert.ToInt32(row["TemplateId"]),
                DayOfWeek = Convert.ToInt16(row["DayOfWeek"]),
                StartTime = (TimeSpan)row["StartTime"],
                EndTime = (TimeSpan)row["EndTime"],
                TaskTitle = row["TaskTitle"].ToString(),
                TaskDescription = row["TaskDescription"].ToString(),
                IsDeleted = Convert.ToBoolean(row["IsDeleted"])
            };
        }
        #endregion
    }
}