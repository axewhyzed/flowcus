using FlowCus.Models;
using FlowCus.Services.Interfaces;
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
        private readonly ITaskCategoryService _categoryService;
        private readonly ILogger<TaskCategoryController> _logger;

        public TaskCategoryController(ITaskCategoryService categoryService, ILogger<TaskCategoryController> logger)
        {
            _categoryService = categoryService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _categoryService.GetAllAsync();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] TaskCategory category)
        {
            try
            {
                var newId = await _categoryService.CreateAsync(category);
                _logger.LogInformation("Task category created. UserId={UserId}, CategoryId={CategoryId}", GetCurrentUserIdForLog(), newId);
                return Ok(new { id = newId, message = "Category created" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task category create rejected. UserId={UserId}, Reason={Reason}", GetCurrentUserIdForLog(), ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                _logger.LogWarning("Task category create conflict. UserId={UserId}, Name={Name}", GetCurrentUserIdForLog(), category.Name);
                return Conflict(new { message = "A category with this name already exists." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _categoryService.DeleteAsync(id);

                if (!success)
                {
                    _logger.LogWarning("Task category delete target not found. UserId={UserId}, CategoryId={CategoryId}", GetCurrentUserIdForLog(), id);
                    return NotFound(new { message = "Category not found" });
                }

                _logger.LogInformation("Task category deleted. UserId={UserId}, CategoryId={CategoryId}", GetCurrentUserIdForLog(), id);
                return Ok(new { message = "Category deleted" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task category delete rejected. UserId={UserId}, CategoryId={CategoryId}, Reason={Reason}", GetCurrentUserIdForLog(), id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskCategory category)
        {
            if (id <= 0 || category == null)
                return BadRequest(new { message = "Invalid category data" });

            category.Id = id;
            try
            {
                var success = await _categoryService.UpdateAsync(category);

                if (!success)
                {
                    _logger.LogWarning("Task category update target not found. UserId={UserId}, CategoryId={CategoryId}", GetCurrentUserIdForLog(), id);
                    return NotFound(new { message = "Category not found" });
                }

                _logger.LogInformation("Task category updated. UserId={UserId}, CategoryId={CategoryId}", GetCurrentUserIdForLog(), id);
                return Ok(new { message = "Category updated" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task category update rejected. UserId={UserId}, CategoryId={CategoryId}, Reason={Reason}", GetCurrentUserIdForLog(), id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                _logger.LogWarning("Task category update conflict. UserId={UserId}, CategoryId={CategoryId}, Name={Name}", GetCurrentUserIdForLog(), id, category.Name);
                return Conflict(new { message = "A category with this name already exists." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _categoryService.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(category);
        }

        private int? GetCurrentUserIdForLog()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : null;
        }
    }
}
