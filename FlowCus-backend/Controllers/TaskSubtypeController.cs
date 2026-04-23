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

        public TaskSubtypeController(TaskSubtypeService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] TaskSubtype subtype)
        {
            var newId = await _service.CreateAsync(subtype);
            return Ok(new { id = newId, message = "Subtype created" });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var subtype = await _service.GetByIdAsync(id);
            if (subtype == null) return NotFound();
            return Ok(subtype);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] TaskSubtype subtype)
        {
            if (id <= 0 || subtype == null)
                return BadRequest(new { message = "Invalid subtype data" });

            subtype.Id = id;
            var success = await _service.UpdateAsync(subtype);

            if (!success) return NotFound(new { message = "Subtype not found" });
            return Ok(new { message = "Subtype updated" });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);

            if (!success) return NotFound(new { message = "Subtype not found" });
            return Ok(new { message = "Subtype deleted" });
        }
    }
}