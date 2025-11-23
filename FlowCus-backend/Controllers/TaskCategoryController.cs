using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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
        public async Task<IActionResult> Create([FromBody] TaskCategory category)
        {
            var newId = await _service.CreateAsync(category);
            return Ok(new { id = newId, message = "Category created" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);

            if (!success) return NotFound(new { message = "Category not found" });
            return Ok(new { message = "Category deleted" });
        }
    }
}