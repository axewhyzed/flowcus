using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly TaskService _service;

        public TasksController(TaskService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            return Ok(await _service.GetAllAsync(userId));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskEntity task)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            task.CreatedBy = userId;

            try
            {
                var id = await _service.CreateAsync(task);
                return Ok(new { id, message = "Task created" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                return BadRequest(new { message = ex.MessageText });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskEntity task)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            task.TaskId = id;
            task.CreatedBy = userId;

            try
            {
                var success = await _service.UpdateAsync(task);
                if (!success) return NotFound(new { message = "Task not found" });
                return Ok(new { message = "Task updated" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                return BadRequest(new { message = ex.MessageText });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            var success = await _service.DeleteAsync(id, userId);
            if (!success) return NotFound(new { message = "Task not found" });
            return Ok(new { message = "Task deleted" });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var task = await _service.GetByIdAsync(id, userId);

            if (task == null) return NotFound();
            return Ok(task);
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out userId);
        }
    }
}
