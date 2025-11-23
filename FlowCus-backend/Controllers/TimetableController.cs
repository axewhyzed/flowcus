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
            var id = await _service.CreateItemAsync(item);
            return Ok(new { id });
        }

        // NEW: Add these to support the full frontend service
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
}