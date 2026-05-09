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
            string sqlUser = "SELECT id, username, name, is_admin FROM userlist WHERE id = @UserId AND is_deleted = FALSE LIMIT 1";
            var user = await _db.QuerySingleAsync<dynamic>(sqlUser, new { UserId = userId });

            string sqlAllTasks = "SELECT COUNT(*) FROM tasks WHERE created_by = @UserId AND is_deleted = FALSE";
            var totalPendingTasks = await _db.ExecuteScalarAsync<int>(sqlAllTasks, new { UserId = userId });

            string sqlTodayTasks = @"
                SELECT task_id as TaskId, title, description, start_time as StartTime, end_time as EndTime, priority
                FROM tasks WHERE created_by = @UserId AND is_deleted = FALSE 
                AND DATE(start_time AT TIME ZONE 'UTC') = CURRENT_DATE AT TIME ZONE 'UTC'
                ORDER BY start_time ASC
            ";
            var todayTasks = (await _db.QueryAsync<dynamic>(sqlTodayTasks, new { UserId = userId }))?.ToList() ?? new();

            var now = DateTime.UtcNow;
            int todayDayOfWeek = (int)now.DayOfWeek;
            
            string sqlTodayTimetable = @"
                SELECT i.id, i.start_time as StartTime, i.end_time as EndTime, COALESCE(s.name, c.name) as CategoryName,
                s.name as SubtypeName, COALESCE(s.color_hex, c.color_hex) as ColorHex
                FROM timetable_items i JOIN timetables t ON i.timetable_id = t.id
                LEFT JOIN task_category c ON i.task_category_id = c.id
                LEFT JOIN task_subtypes s ON i.task_subtype_id = s.id
                WHERE t.user_id = @UserId AND t.is_active = TRUE AND t.is_deleted = FALSE
                AND i.is_deleted = FALSE AND i.day_of_week = @DayOfWeek ORDER BY i.start_time ASC";
            var todayTimetable = (await _db.QueryAsync<dynamic>(sqlTodayTimetable, new { UserId = userId, DayOfWeek = todayDayOfWeek }))?.ToList() ?? new();

            return new
            {
                UserName = user?.name ?? "User",
                IsAdmin = user?.is_admin ?? false,
                PendingTasks = totalPendingTasks,
                TotalCategories = await GetCategoryCountAsync(userId),
                TodayTasks = todayTasks,
                TodayTimetable = todayTimetable
            };
        }

        private async Task<int> GetCategoryCountAsync(int userId)
        {
            string sql = "SELECT COUNT(*) FROM task_category WHERE is_deleted = FALSE";
            return await _db.ExecuteScalarAsync<int>(sql);
        }

        public async Task<TimetableItem?> GetActiveFocusAsync(int userId)
        {
            var now = DateTime.UtcNow;
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
                ORDER BY i.start_time
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
