using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService _service;

        public DashboardController(DashboardService service)
        {
            _service = service;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            var stats = await _service.GetDashboardStatsAsync(userId);
            return Ok(stats);
        }

        [HttpGet("now")]
        public async Task<IActionResult> GetCurrentFocus()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            var currentItem = await _service.GetActiveFocusAsync(userId);

            if (currentItem == null)
                return Ok(new { message = "No task scheduled right now. Free time!" });

            return Ok(currentItem);
        }
    }
}