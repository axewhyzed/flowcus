using FlowCus.Helpers;
using FlowCus.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly DBHelper _dbHelper;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(DBHelper dbHelper, ILogger<DashboardController> logger)
        {
            _dbHelper = dbHelper;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return int.TryParse(idClaim, out int userId) ? userId : throw new UnauthorizedAccessException("Invalid user ID");
        }

        // GET api/dashboard
        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                int userId = GetCurrentUserId();
                var today = DateTime.UtcNow.DayOfWeek;

                var result = new Dictionary<string, object>();

                string userSql = "SELECT name, is_admin FROM userlist WHERE id = @userId";
                var userDt = await _dbHelper.GetTableAsync(userSql, new NpgsqlParameter("@userId", userId));

                var userRow = userDt.Rows[0];
                result["userName"] = userRow["name"]?.ToString() ?? "User";
                result["isAdmin"] = userRow["is_admin"] != DBNull.Value ? Convert.ToBoolean(userRow["is_admin"]) : false;


                // 2. Active timetable items for today
                string timetableSql = @"
                    SELECT ti.id, ti.task_category_id, ti.task_subtype_id, ti.day_of_week, ti.start_time, ti.end_time,
                           tc.name AS category_name, ts.name AS subtype_name
                    FROM timetable_items ti
                    JOIN timetables t ON ti.timetable_id = t.id
                    JOIN task_category tc ON ti.task_category_id = tc.id
                    LEFT JOIN task_subtypes ts ON ti.task_subtype_id = ts.id
                    WHERE t.user_id = @userId
                      AND t.is_active = TRUE
                      AND ti.day_of_week = @dayOfWeek
                      AND ti.is_deleted = FALSE
                    ORDER BY ti.start_time";

                var timetableParams = new[]
                {
                    new NpgsqlParameter("@userId", userId),
                    new NpgsqlParameter("@dayOfWeek", (int)today)
                };

                var timetableDt = await _dbHelper.GetTableAsync(timetableSql, timetableParams);
                var timetableItems = new List<object>();
                foreach (DataRow row in timetableDt.Rows)
                {
                    timetableItems.Add(new
                    {
                        Id = row["id"],
                        TaskCategoryId = row["task_category_id"],
                        CategoryName = row["category_name"],
                        TaskSubtypeId = row["task_subtype_id"],
                        SubtypeName = row["subtype_name"],
                        DayOfWeek = row["day_of_week"],
                        StartTime = row["start_time"],
                        EndTime = row["end_time"]
                    });
                }
                result["todayTimetable"] = timetableItems;

                // 3. Tasks created today
                string tasksSql = @"
                    SELECT t.task_id, t.title, t.description, t.start_time, t.end_time, t.duration_seconds,
                           tc.name AS category_name, ts.name AS subtype_name
                    FROM tasks t
                    JOIN task_category tc ON t.task_category_id = tc.id
                    LEFT JOIN task_subtypes ts ON t.task_subtype_id = ts.id
                    WHERE t.created_by = @userId
                      AND t.is_deleted = FALSE
                      AND DATE(t.created_on) = CURRENT_DATE
                    ORDER BY t.start_time";

                var tasksDt = await _dbHelper.GetTableAsync(tasksSql, new NpgsqlParameter("@userId", userId));
                var tasks = new List<object>();
                foreach (DataRow row in tasksDt.Rows)
                {
                    tasks.Add(new
                    {
                        TaskId = row["task_id"],
                        Title = row["title"],
                        Description = row["description"],
                        StartTime = row["start_time"],
                        EndTime = row["end_time"],
                        DurationSeconds = row["duration_seconds"],
                        CategoryName = row["category_name"],
                        SubtypeName = row["subtype_name"]
                    });
                }
                result["todayTasks"] = tasks;

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching dashboard data");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}
