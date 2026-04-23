using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/task-category")]
    [Authorize]
    public class TaskCategoryController : ControllerBase
    {
        private readonly TaskCategoryService _service;

        public TaskCategoryController(TaskCategoryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            // FIX: Removed userId argument as categories are global
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")] // Only admins can create global categories
        public async Task<IActionResult> Create([FromBody] TaskCategory category)
        {
            try
            {
                var newId = await _service.CreateAsync(category);
                return Ok(new { id = newId, message = "Category created" });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                return Conflict(new { message = "A category with this name already exists." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Only admins can delete global categories
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);

            if (!success) return NotFound(new { message = "Category not found" });
            return Ok(new { message = "Category deleted" });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskCategory category)
        {
            if (id <= 0 || category == null)
                return BadRequest(new { message = "Invalid category data" });

            category.Id = id; // Ensure ID matches
            try
            {
                var success = await _service.UpdateAsync(category);

                if (!success) return NotFound(new { message = "Category not found" });
                return Ok(new { message = "Category updated" });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                return Conflict(new { message = "A category with this name already exists." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            // Assuming categories are global, otherwise pass userId
            var category = await _service.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(category);
        }
    }
}
