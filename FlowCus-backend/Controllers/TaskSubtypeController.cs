using FlowCus.Models;
using FlowCus.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Npgsql; // for exception handling

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TaskSubtypeController : ControllerBase
    {
        private readonly TaskSubtypeService _service;

        public TaskSubtypeController(TaskSubtypeService service)
        {
            _service = service;
        }

        [HttpGet("by-letter/{letter}")]
        public async Task<IActionResult> GetByLetter(string letter)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _service.GetByStartLetterAsync(letter, userId);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaskSubtype subtype)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            subtype.UserId = userId;

            try
            {
                var newId = await _service.CreateAsync(subtype);
                return Ok(new { id = newId });
            }
            catch (PostgresException ex) when (ex.Message.Contains("limit"))
            {
                // Handle your custom DB function error 'enforce_subtype_limit'
                return BadRequest(new { error = "Subtype limit reached for this category." });
            }
        }
    }
}