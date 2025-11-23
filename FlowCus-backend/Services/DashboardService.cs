using Dapper;
using FlowCus.Helpers;
using FlowCus.Models;

namespace FlowCus.Services
{
    public class DashboardService
    {
        private readonly DBHelper _db;

        public DashboardService(DBHelper db)
        {
            _db = db;
        }

        public async Task<object> GetDashboardStatsAsync(int userId)
        {
            // Run multiple queries in parallel or sequentially
            string sqlTasks = "SELECT COUNT(*) FROM tasks WHERE created_by = @CreatedBy AND is_deleted = FALSE";
            string sqlCats = "SELECT COUNT(*) FROM task_category WHERE is_deleted = FALSE";

            var pending = await _db.ExecuteScalarAsync<int>(sqlTasks, new { CreatedBy = userId });
            var categories = await _db.ExecuteScalarAsync<int>(sqlCats, new { CreatedBy = userId });

            return new
            {
                PendingTasks = pending,
                TotalCategories = categories
            };
        }

        // NEW: Get the item currently scheduled for Now
        public async Task<TimetableItem?> GetActiveFocusAsync(int userId)
        {
            var now = DateTime.Now;
            int currentDayOfWeek = (int)now.DayOfWeek; // 0 = Sunday
            TimeSpan currentTime = now.TimeOfDay;

            string sql = @"
                SELECT i.*, 
                       COALESCE(s.name, c.name) as TaskName, 
                       COALESCE(s.color_hex, c.color_hex) as ColorHex 
                FROM timetable_items i
                JOIN timetables t ON i.timetable_id = t.id
                LEFT JOIN task_category c ON i.task_category_id = c.id
                LEFT JOIN task_subtypes s ON i.task_subtype_id = s.id
                WHERE t.user_id = @UserId 
                  AND t.is_active = TRUE 
                  AND t.is_deleted = FALSE
                  AND i.is_deleted = FALSE
                  AND i.day_of_week = @Day
                  AND i.start_time <= @Time 
                  AND i.end_time > @Time
                LIMIT 1";

            return await _db.QuerySingleAsync<TimetableItem>(sql, new
            {
                UserId = userId,
                Day = currentDayOfWeek,
                Time = currentTime
            });
        }
    }
}