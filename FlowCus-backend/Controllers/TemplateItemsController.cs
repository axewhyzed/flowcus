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
                    SELECT id, template_id, day_of_week, start_time, end_time, 
                task_title, task_description, is_deleted
                    FROM template_items
                    WHERE template_id = @template_id AND is_deleted = false";

                var parameters = new NpgsqlParameter[] { new("@template_id", templateId) };
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
                    SELECT id, template_id, day_of_week, start_time, end_time, 
                task_title, task_description, is_deleted
                    FROM template_items
                    WHERE id = @id AND is_deleted = false";

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
                    INSERT INTO template_items (
                        template_id, day_of_week, start_time, end_time, 
                    task_title, task_description, is_deleted
                    )
                    VALUES (
                        @template_id, @day_of_week, @start_time, @end_time,
                        @task_title, @task_description, @is_deleted
                    )
                    RETURNING id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@template_id", item.TemplateId),
                    new("@day_of_week", item.DayOfWeek),
                    new("@start_time", item.StartTime),
                    new("@end_time", item.EndTime),
                    new("@task_title", item.TaskTitle),
                    new("@task_description", item.TaskDescription ?? string.Empty),
                    new("@is_deleted", false)
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
                    UPDATE template_items SET
                        day_of_week = @day_of_week,
                        start_time = @start_time,
                        end_time = @end_time,
                        task_title = @task_title,
                        task_description = @task_description
                    WHERE Id = @id AND IsDeleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@day_of_week", item.DayOfWeek),
                    new("@start_time", item.StartTime),
                    new("@end_time", item.EndTime),
                    new("@task_title", item.TaskTitle),
                    new("@task_description", item.TaskDescription ?? string.Empty),
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
                    UPDATE template_items 
                    SET is_deleted = true 
                    WHERE id = @id";

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

        // In TemplateItemsController.cs
        /// <summary>
        /// Adds multiple items to a template in a single request
        /// </summary>
        [HttpPost("batch")]
        public async Task<IActionResult> PostTemplateItemsBatch([FromBody] List<TemplateItem> items)
        {
            try
            {
                // Validate all items belong to the same template
                if (items.GroupBy(i => i.TemplateId).Count() > 1)
                    return BadRequest("All items must belong to the same template");

                var valueRows = new List<string>();
                var parameters = new List<NpgsqlParameter>();
                for (var i = 0; i < items.Count; i++)
                {
                    valueRows.Add($"(@template_id{i}, @day_of_week{i}, @start_time{i}, @end_time{i}, @task_title{i}, @task_description{i}, false)");
                    parameters.AddRange(new[]
                    {
                new NpgsqlParameter($"@template_id{i}", items[i].TemplateId),
                new NpgsqlParameter($"@day_of_week{i}", items[i].DayOfWeek),
                new NpgsqlParameter($"@start_time{i}", items[i].StartTime),
                new NpgsqlParameter($"@end_time{i}", items[i].EndTime),
                new NpgsqlParameter($"@task_title{i}", items[i].TaskTitle),
                new NpgsqlParameter($"@task_description{i}", items[i].TaskDescription ?? string.Empty)
            });
                }

                string query = $@"
            INSERT INTO template_items (
                template_id, day_of_week, , end_time, 
                task_title, task_description, is_deleted
            )
            VALUES {string.Join(", ", valueRows)}";

                await _dbHelper.ExecuteQueryAsync(query, parameters.ToArray());
                return Ok(new { Message = $"{items.Count} items added successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating batch template items");
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
                Id = Convert.ToInt32(row["id"]),
                TemplateId = Convert.ToInt32(row["template_id"]),
                DayOfWeek = Convert.ToInt16(row["day_of_week"]),
                StartTime = (TimeSpan)row["start_time"],
                EndTime = (TimeSpan)row["end_time"],
                TaskTitle = row["task_title"].ToString(),
                TaskDescription = row["task_description"].ToString(),
                IsDeleted = Convert.ToBoolean(row["is_deleted"])
            };
        }
        #endregion
    }
}