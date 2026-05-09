using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/timetable")]
    [Authorize]
    public class TimetableController : ControllerBase
    {
        private readonly TimetableService _service;
        private readonly ILogger<TimetableController> _logger;

        public TimetableController(TimetableService service, ILogger<TimetableController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // --- Timetable Endpoints ---

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            return Ok(await _service.GetAllAsync(userId));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Timetable t)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            t.UserId = userId;

            try
            {
                var id = await _service.CreateAsync(t);
                _logger.LogInformation("Timetable created. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return Ok(new { id, message = "Timetable created successfully." });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Timetable create rejected. UserId={UserId}, Reason={Reason}", userId, ex.Message);
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> Activate(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var success = await _service.ActivateTimetableAsync(id, userId);
            if (!success)
            {
                _logger.LogWarning("Timetable activate target not found. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return NotFound(new { message = "Timetable not found." });
            }

            _logger.LogInformation("Timetable activated. UserId={UserId}, TimetableId={TimetableId}", userId, id);
            return Ok(new { message = "Timetable activated successfully." });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null) return NotFound();
            return Ok(timetable);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTimetableRequest request)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            
            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null)
            {
                _logger.LogWarning("Timetable update target not found. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return NotFound(new { message = "Timetable not found." });
            }

            try
            {
                var success = await _service.UpdateAsync(id, request.Name, userId);
                if (!success)
                {
                    _logger.LogWarning("Timetable update target not found. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                    return NotFound(new { message = "Timetable not found." });
                }

                if (request.IsActive && !timetable.IsActive)
                {
                    await _service.ActivateTimetableAsync(id, userId);
                }
                else if (!request.IsActive && timetable.IsActive)
                {
                    await _service.DeactivateTimetableAsync(id, userId);
                }

                _logger.LogInformation("Timetable updated. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return Ok(new { message = "Timetable updated successfully." });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Timetable update rejected. UserId={UserId}, TimetableId={TimetableId}, Reason={Reason}", userId, id, ex.Message);
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null)
            {
                _logger.LogWarning("Timetable delete target not found. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return NotFound(new { message = "Timetable not found." });
            }

            var success = await _service.DeleteAsync(id, userId);
            if (!success)
            {
                _logger.LogWarning("Timetable delete target not found. UserId={UserId}, TimetableId={TimetableId}", userId, id);
                return NotFound(new { message = "Timetable not found." });
            }

            _logger.LogInformation("Timetable deleted. UserId={UserId}, TimetableId={TimetableId}", userId, id);
            return Ok(new { message = "Timetable deleted successfully." });
        }

        // --- Timetable Item Endpoints ---

        [HttpGet("{timetableId}/items")]
        public async Task<IActionResult> GetItems(int timetableId)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();
            var items = await _service.GetItemsAsync(timetableId, userId);
            return Ok(items);
        }

        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] TimetableItem item)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var timetable = await _service.GetByIdAsync(item.TimetableId, userId);
            if (timetable == null)
            {
                _logger.LogWarning("Timetable item create forbidden. UserId={UserId}, TimetableId={TimetableId}", userId, item.TimetableId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "You do not have permission to add items to this timetable." });
            }

            try
            {
                var id = await _service.CreateItemAsync(item, userId);
                _logger.LogInformation("Timetable item created. UserId={UserId}, TimetableId={TimetableId}, ItemId={ItemId}", userId, item.TimetableId, id);
                return Ok(new { id, message = "Item created" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Timetable item create rejected. UserId={UserId}, TimetableId={TimetableId}, Reason={Reason}", userId, item.TimetableId, ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23502")
            {
                // NOT NULL constraint violated
                _logger.LogWarning(pgEx, "Timetable item create missing field. UserId={UserId}, TimetableId={TimetableId}", userId, item.TimetableId);
                return BadRequest(new { error = "Required field is missing or invalid." });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23503")
            {
                // Foreign key constraint violated
                _logger.LogWarning(pgEx, "Timetable item create invalid reference. UserId={UserId}, TimetableId={TimetableId}", userId, item.TimetableId);
                return BadRequest(new { error = "Invalid task category or subtype reference." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating timetable item");
                return StatusCode(500, new { error = "Failed to create timetable item." });
            }
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] TimetableItem item)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            try
            {
                var success = await _service.UpdateItemAsync(id, item, userId);
                if (!success)
                {
                    _logger.LogWarning("Timetable item update target not found. UserId={UserId}, ItemId={ItemId}", userId, id);
                    return NotFound(new { message = "Item not found" });
                }

                _logger.LogInformation("Timetable item updated. UserId={UserId}, ItemId={ItemId}", userId, id);
                return Ok(new { message = "Item updated" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Timetable item update rejected. UserId={UserId}, ItemId={ItemId}, Reason={Reason}", userId, id, ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                _logger.LogWarning(ex, "Timetable item update database error. UserId={UserId}, ItemId={ItemId}", userId, id);
                return BadRequest(new { error = ex.MessageText });
            }
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            if (!TryGetCurrentUserId(out int userId)) return Unauthorized();

            var success = await _service.DeleteItemAsync(id, userId);
            if (!success)
            {
                _logger.LogWarning("Timetable item delete target not found. UserId={UserId}, ItemId={ItemId}", userId, id);
                return NotFound(new { message = "Item not found" });
            }

            _logger.LogInformation("Timetable item deleted. UserId={UserId}, ItemId={ItemId}", userId, id);
            return Ok(new { message = "Item deleted" });
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out userId);
        }
    }

    public class UpdateTimetableRequest
    {
        public string Name { get; set; } = "";
        public bool IsActive { get; set; }
    }
}
