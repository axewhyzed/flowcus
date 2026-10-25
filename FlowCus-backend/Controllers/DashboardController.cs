using FlowCus.Helpers;
using FlowCus.Services.Interfaces;
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
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int? timezoneOffset)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            if (!TimezoneHelper.TryResolveRequestTimeZone(Request, out var timeZone, out var error, timezoneOffset))
                return BadRequest(new { error });

            var stats = await _dashboardService.GetDashboardStatsAsync(userId, timeZone);
            return Ok(stats);
        }

        [HttpGet("now")]
        public async Task<IActionResult> GetCurrentFocus([FromQuery] int? timezoneOffset)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId)) return Unauthorized();

            if (!TimezoneHelper.TryResolveRequestTimeZone(Request, out var timeZone, out var error, timezoneOffset))
                return BadRequest(new { error });

            var currentItem = await _dashboardService.GetActiveFocusAsync(userId, timeZone);

            if (currentItem == null)
                return Ok(new { message = "No task scheduled right now. Free time!" });

            return Ok(currentItem);
        }

    }
}
