using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/task-subtype")]
    [Authorize]
    public class TaskSubtypeController : ControllerBase
    {
        private readonly TaskSubtypeService _service;
        private readonly ILogger<TaskSubtypeController> _logger;

        public TaskSubtypeController(TaskSubtypeService service, ILogger<TaskSubtypeController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var result = await _service.GetAllAsync(userId);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskSubtype subtype)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            subtype.UserId = userId;

            try
            {
                var newId = await _service.CreateAsync(subtype);
                _logger.LogInformation("Task subtype created. UserId={UserId}, SubtypeId={SubtypeId}", userId, newId);
                return Ok(new { id = newId, message = "Subtype created" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task subtype create rejected. UserId={UserId}, Reason={Reason}", userId, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                _logger.LogWarning("Task subtype create conflict. UserId={UserId}, Name={Name}", userId, subtype.Name);
                return Conflict(new { message = "A subtype with this name already exists." });
            }
            catch (Npgsql.PostgresException ex)
            {
                _logger.LogWarning(ex, "Task subtype create database error. UserId={UserId}", userId);
                return BadRequest(new { message = ex.MessageText });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var subtype = await _service.GetByIdAsync(id, userId);
            if (subtype == null) return NotFound();
            return Ok(subtype);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskSubtype subtype)
        {
            if (id <= 0 || subtype == null)
                return BadRequest(new { message = "Invalid subtype data" });

            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            subtype.Id = id;
            subtype.UserId = userId;

            try
            {
                var success = await _service.UpdateAsync(subtype);

                if (!success)
                {
                    _logger.LogWarning("Task subtype update target not found. UserId={UserId}, SubtypeId={SubtypeId}", userId, id);
                    return NotFound(new { message = "Subtype not found" });
                }

                _logger.LogInformation("Task subtype updated. UserId={UserId}, SubtypeId={SubtypeId}", userId, id);
                return Ok(new { message = "Subtype updated" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Task subtype update rejected. UserId={UserId}, SubtypeId={SubtypeId}, Reason={Reason}", userId, id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
            {
                _logger.LogWarning("Task subtype update conflict. UserId={UserId}, SubtypeId={SubtypeId}, Name={Name}", userId, id, subtype.Name);
                return Conflict(new { message = "A subtype with this name already exists." });
            }
            catch (Npgsql.PostgresException ex)
            {
                _logger.LogWarning(ex, "Task subtype update database error. UserId={UserId}, SubtypeId={SubtypeId}", userId, id);
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
                _logger.LogWarning("Task subtype delete target not found. UserId={UserId}, SubtypeId={SubtypeId}", userId, id);
                return NotFound(new { message = "Subtype not found" });
            }

            _logger.LogInformation("Task subtype deleted. UserId={UserId}, SubtypeId={SubtypeId}", userId, id);
            return Ok(new { message = "Subtype deleted" });
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out userId);
        }
    }
}
