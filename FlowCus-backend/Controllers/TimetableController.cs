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
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            return Ok(await _service.GetAllAsync(userId));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Timetable t)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            t.UserId = userId;
            var id = await _service.CreateAsync(t);
            return Ok(new { id });
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> Activate(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var success = await _service.ActivateTimetableAsync(id, userId);
            if (!success) return NotFound(new { message = "Timetable not found." });

            return Ok(new { message = "Timetable activated successfully." });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null) return NotFound();
            return Ok(timetable);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTimetableRequest request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            // Verify ownership before updating
            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null) return NotFound(new { message = "Timetable not found." });

            var success = await _service.UpdateAsync(id, request.Name, request.IsActive, userId);
            if (!success) return NotFound();

            if (request.IsActive)
            {
                await _service.ActivateTimetableAsync(id, userId);
            }

            return Ok(new { message = "Timetable updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            // Verify ownership before deleting
            var timetable = await _service.GetByIdAsync(id, userId);
            if (timetable == null) return NotFound(new { message = "Timetable not found." });

            var success = await _service.DeleteAsync(id, userId);
            if (!success) return NotFound();

            return Ok(new { message = "Timetable deleted successfully." });
        }

        // --- Timetable Item Endpoints ---

        [HttpGet("{timetableId}/items")]
        public async Task<IActionResult> GetItems(int timetableId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            // Service ensures user owns the timetable before fetching items
            var items = await _service.GetItemsAsync(timetableId, userId);
            return Ok(items);
        }

        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] TimetableItem item)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var timetable = await _service.GetByIdAsync(item.TimetableId, userId);
            if (timetable == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "You do not have permission to add items to this timetable." });
            }

            try
            {
                var id = await _service.CreateItemAsync(item, userId);
                return Ok(new { id });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23502")
            {
                // NOT NULL constraint violated
                return BadRequest(new { error = "Required field is missing or invalid." });
            }
            catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "23503")
            {
                // Foreign key constraint violated
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
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var success = await _service.UpdateItemAsync(id, item, userId);
                if (!success) return NotFound();

                return Ok(new { message = "Item updated" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Npgsql.PostgresException ex)
            {
                return BadRequest(new { error = ex.MessageText });
            }
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            // You'll need to add DeleteItemAsync to TimetableService.cs
            var success = await _service.DeleteItemAsync(id, userId);
            if (!success) return NotFound();

            return Ok(new { message = "Item deleted" });
        }
    }

    public class UpdateTimetableRequest
    {
        public string Name { get; set; } = "";
        public bool IsActive { get; set; }
    }
}
