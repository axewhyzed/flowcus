using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Data;
using System.Threading.Tasks;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<UserController> _logger;

        public UserController(DBHelper dbHelper, ILogger<UserController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        // GET api/user/me
        [HttpGet("me")]
        public async Task<IActionResult> GetProfile()
        {
            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId))
                return Unauthorized(new { error = "Invalid token" });

            try
            {
                string sql = "SELECT id, username, name, created_on, updated_on FROM userlist WHERE id = @id LIMIT 1";
                var p = new NpgsqlParameter("@id", userId);
                var dt = await _dbHelper.GetTableAsync(sql, p);

                if (dt.Rows.Count == 0)
                    return NotFound(new { error = "User not found" });

                var row = dt.Rows[0];
                return Ok(new
                {
                    Id = row["id"],
                    Username = row["username"],
                    Name = row["name"],
                    CreatedOn = row["created_on"],
                    UpdatedOn = row["updated_on"]
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profile for user {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        // PUT api/user
        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { error = "Name cannot be empty" });

            var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out int userId))
                return Unauthorized(new { error = "Invalid token" });

            try
            {
                string sql = "UPDATE userlist SET name = @name, updated_on = now() WHERE id = @id";
                var p1 = new NpgsqlParameter("@name", request.Name);
                var p2 = new NpgsqlParameter("@id", userId);

                int rows = await _dbHelper.ExecuteQueryAsync(sql, p1, p2);
                if (rows == 1)
                    return Ok(new { message = "Profile updated successfully" });
                else
                    return NotFound(new { error = "User not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }

    public class UpdateUserRequest
    {
        public string Name { get; set; } = "";
    }
}
