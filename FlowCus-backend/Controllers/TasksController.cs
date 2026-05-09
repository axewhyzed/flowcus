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
        private readonly ILogger<TasksController> _logger;

        public TasksController(TaskService service, ILogger<TasksController> logger)
        {
            _service = service;
            _logger = logger;
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
                _logger.LogInformation("Task created. UserId={UserId}, TaskId={TaskId}", userId, id);
                return Ok(new { id, message = "Task created" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task create rejected. UserId={UserId}, Reason={Reason}", userId, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                _logger.LogWarning(ex, "Task create database error. UserId={UserId}", userId);
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
                if (!success)
                {
                    _logger.LogWarning("Task update target not found. UserId={UserId}, TaskId={TaskId}", userId, id);
                    return NotFound(new { message = "Task not found" });
                }

                _logger.LogInformation("Task updated. UserId={UserId}, TaskId={TaskId}", userId, id);
                return Ok(new { message = "Task updated" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task update rejected. UserId={UserId}, TaskId={TaskId}, Reason={Reason}", userId, id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                _logger.LogWarning(ex, "Task update database error. UserId={UserId}, TaskId={TaskId}", userId, id);
                return BadRequest(new { message = ex.MessageText });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            var success = await _service.DeleteAsync(id, userId);
            if (!success)
            {
                _logger.LogWarning("Task delete target not found. UserId={UserId}, TaskId={TaskId}", userId, id);
                return NotFound(new { message = "Task not found" });
            }

            _logger.LogInformation("Task deleted. UserId={UserId}, TaskId={TaskId}", userId, id);
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
