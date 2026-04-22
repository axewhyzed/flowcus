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

        public TimetableController(TimetableService service)
        {
            _service = service;
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

            var success = await _service.UpdateAsync(id, request.Name, userId);
            if (!success) return NotFound();

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
            // SECURITY FIX: Extract userId and verify timetable ownership
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            // Verify that the timetable belongs to this user before creating an item
            var timetable = await _service.GetByIdAsync(item.TimetableId, userId);
            if (timetable == null)
            {
                return Forbidden(new { error = "You do not have permission to add items to this timetable." });
            }

            try
            {
                var id = await _service.CreateItemAsync(item);
                return Ok(new { id });
            }
            catch (InvalidOperationException ex)
            {
                // VALIDATION FIX: Return 400 for overlap conflicts instead of 500
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] TimetableItem item)
        {
            // Add UpdateItemAsync to your TimetableService first if it's missing!
            // Assuming strict layering:
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            // You'll need to add UpdateItemAsync to TimetableService.cs
            var success = await _service.UpdateItemAsync(id, item, userId);
            if (!success) return NotFound();

            return Ok(new { message = "Item updated" });
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
    }
}