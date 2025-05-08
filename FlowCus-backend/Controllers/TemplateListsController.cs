// TemplateListsController.cs
using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Data;

namespace FlowCus.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplateListsController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<TemplateListsController> _logger;

        public TemplateListsController(DBHelper dbHelper, ILogger<TemplateListsController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        /// <summary>
        /// Gets all templates for a user
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTemplates(int userId)
        {
            try
            {
                const string query = @"
                    SELECT id, user_id, template_name, is_deleted, created_at 
                    FROM template_list 
                    WHERE user_id = @userId AND is_deleted = false";

                var parameters = new NpgsqlParameter[] { new("@userId", userId) };
                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return Ok(DataTableToTemplateList(dt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving templates for user {userId}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Gets a specific template by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplate(int id)
        {
            try
            {
                const string query = @"
                    SELECT id, user_id, template_name, is_deleted, created_at 
                    FROM template_list 
                    WHERE id = @id AND is_deleted = false";

                var parameters = new NpgsqlParameter[] { new("@id", id) };
                var dt = await _dbHelper.GetTableAsync(query, parameters);
                return dt.Rows.Count == 0 ? NotFound() : Ok(DataRowToTemplateList(dt.Rows[0]));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Creates a new timetable template
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> PostTemplate([FromBody] TemplateList template)
        {
            try
            {
                const string query = @"
                    INSERT INTO template_list (
                        user_id, template_name, is_deleted, created_at
                    ) 
                    VALUES (
                        @userId, @templateName, @isDeleted, @createdAt
                    )
                    RETURNING Id";

                var parameters = new NpgsqlParameter[]
                {
                    new("@userId", template.UserId),
                    new("@templateName", template.TemplateName),
                    new("@isDeleted", false),
                    new("@createdAt", DateTime.UtcNow)
                };

                var newId = await _dbHelper.GetValueAsync(query, parameters);
                return CreatedAtAction(nameof(GetTemplate), new { id = newId }, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating template");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Updates a template's name
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTemplate(int id, [FromBody] TemplateList template)
        {
            try
            {
                // Verify existence first
                var existing = await GetTemplate(id) as OkObjectResult;
                if (existing == null) return NotFound();

                const string query = @"
                    UPDATE template_list 
                    SET template_name = @templateName 
                    WHERE id = @id AND is_deleted = false";

                var parameters = new NpgsqlParameter[]
                {
                    new("@templateName", template.TemplateName),
                    new("@id", id)
                };

                await _dbHelper.ExecuteQueryAsync(query, parameters);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Soft deletes a template
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            try
            {
                const string query = @"
                    UPDATE template_list 
                    SET is_deleted = true 
                    WHERE id = @id";

                var parameters = new NpgsqlParameter[] { new("@id", id) };
                int affected = await _dbHelper.ExecuteQueryAsync(query, parameters);
                return affected == 0 ? NotFound() : NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting template {id}");
                return StatusCode(500, "Internal server error");
            }
        }

        #region Helpers
        private List<TemplateList> DataTableToTemplateList(DataTable dt)
        {
            return dt.AsEnumerable().Select(DataRowToTemplateList).ToList();
        }

        private TemplateList DataRowToTemplateList(DataRow row)
        {
            return new TemplateList
            {
                Id = Convert.ToInt32(row["id"]),
                UserId = Convert.ToInt32(row["user_id"]),
                TemplateName = row["template_name"].ToString(),
                IsDeleted = Convert.ToBoolean(row["is_deleted"]),
                CreatedAt = Convert.ToDateTime(row["created_at"])
            };
        }
        #endregion
    }
}