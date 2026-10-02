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
        public async Task<IActionResult> GetStats([FromQuery] int? timezoneOffset)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            int? offset = GetTimezoneOffset(timezoneOffset);
            var stats = await _service.GetDashboardStatsAsync(userId, offset);
            return Ok(stats);
        }

        [HttpGet("now")]
        public async Task<IActionResult> GetCurrentFocus([FromQuery] int? timezoneOffset)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            int? offset = GetTimezoneOffset(timezoneOffset);
            var currentItem = await _service.GetActiveFocusAsync(userId, offset);

            if (currentItem == null)
                return Ok(new { message = "No task scheduled right now. Free time!" });

            return Ok(currentItem);
        }

        private int? GetTimezoneOffset(int? queryOffset)
        {
            if (queryOffset.HasValue) return queryOffset;
            if (Request.Headers.TryGetValue("X-Timezone-Offset", out var headerVal) &&
                int.TryParse(headerVal.FirstOrDefault(), out int parsedHeaderOffset))
            {
                return parsedHeaderOffset;
            }
            return null;
        }
    }
}