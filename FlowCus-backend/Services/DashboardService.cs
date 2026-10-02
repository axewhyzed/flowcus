using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using System.Linq;

namespace FlowCus.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDbHelper _db;

        public DashboardService(IDbHelper db)
        {
            _db = db;
        }

        public async Task<object> GetDashboardStatsAsync(int userId, int? timezoneOffsetMinutes = null)
        {
            int offset = timezoneOffsetMinutes ?? 0;
            var userLocalNow = DateTime.UtcNow.AddMinutes(-offset);
            int todayDayOfWeek = (int)userLocalNow.DayOfWeek;

            var startOfDayUtc = userLocalNow.Date.AddMinutes(offset);
            var endOfDayUtc = startOfDayUtc.AddDays(1);

            string sqlUser = "SELECT id, username, name, is_admin FROM userlist WHERE id = @UserId AND is_deleted = FALSE LIMIT 1";
            var user = await _db.QuerySingleAsync<dynamic>(sqlUser, new { UserId = userId });

            string sqlAllPending = "SELECT COUNT(*) FROM tasks WHERE created_by = @UserId AND is_completed = FALSE AND is_deleted = FALSE";
            var totalPendingTasks = await _db.ExecuteScalarAsync<int>(sqlAllPending, new { UserId = userId });

            string sqlTotalTasks = "SELECT COUNT(*) FROM tasks WHERE created_by = @UserId AND is_deleted = FALSE";
            var totalTasks = await _db.ExecuteScalarAsync<int>(sqlTotalTasks, new { UserId = userId });

            string sqlCompletedTasks = "SELECT COUNT(*) FROM tasks WHERE created_by = @UserId AND is_completed = TRUE AND is_deleted = FALSE";
            var completedTasks = await _db.ExecuteScalarAsync<int>(sqlCompletedTasks, new { UserId = userId });

            string sqlTodayTasks = @"
                SELECT task_id as TaskId, title, description, start_time as StartTime, end_time as EndTime, 
                       priority, is_completed as IsCompleted, task_category_id as TaskCategoryId, task_subtype_id as TaskSubtypeId
                FROM tasks 
                WHERE created_by = @UserId AND is_deleted = FALSE 
                  AND (
                      (start_time IS NOT NULL AND start_time >= @StartUtc AND start_time < @EndUtc)
                      OR (start_time IS NULL AND created_on >= @StartUtc AND created_on < @EndUtc)
                  )
                ORDER BY start_time ASC NULLS LAST, created_on DESC";

            var todayTasks = (await _db.QueryAsync<dynamic>(sqlTodayTasks, new 
            { 
                UserId = userId, 
                StartUtc = startOfDayUtc, 
                EndUtc = endOfDayUtc 
            }))?.ToList() ?? new();

            string sqlTodayTimetable = @"
                SELECT i.id, i.start_time as StartTime, i.end_time as EndTime, 
                       COALESCE(s.name, c.name) as CategoryName,
                       COALESCE(s.name, c.name) as TaskName,
                       COALESCE(s.name, c.name) as Title,
                       s.name as SubtypeName, 
                       COALESCE(s.color_hex, c.color_hex) as ColorHex
                FROM timetable_items i 
                JOIN timetables t ON i.timetable_id = t.id
                LEFT JOIN task_category c ON i.task_category_id = c.id
                LEFT JOIN task_subtypes s ON i.task_subtype_id = s.id
                WHERE t.user_id = @UserId AND t.is_active = TRUE AND t.is_deleted = FALSE
                  AND i.is_deleted = FALSE AND i.day_of_week = @DayOfWeek 
                ORDER BY i.start_time ASC";

            var todayTimetable = (await _db.QueryAsync<dynamic>(sqlTodayTimetable, new 
            { 
                UserId = userId, 
                DayOfWeek = todayDayOfWeek 
            }))?.ToList() ?? new();

            // Mobile-optimized stats calculation
            double completionRate = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks * 100.0, 1) : 0.0;

            string sqlFocusSeconds = "SELECT COALESCE(SUM(duration_seconds), 0) FROM tasks WHERE created_by = @UserId AND is_deleted = FALSE AND duration_seconds IS NOT NULL";
            double totalFocusSeconds = await _db.ExecuteScalarAsync<double>(sqlFocusSeconds, new { UserId = userId });
            double dailyAvgHours = Math.Round(totalFocusSeconds / 3600.0 / Math.Max(1, 7), 1);

            // Calculate consecutive active streak days
            var distinctDates = (await _db.QueryAsync<DateTime>(@"
                SELECT DISTINCT DATE(created_on) 
                FROM tasks 
                WHERE created_by = @UserId AND is_deleted = FALSE 
                ORDER BY DATE(created_on) DESC",
                new { UserId = userId }))?.Select(d => DateOnly.FromDateTime(d)).ToHashSet() ?? new();

            int streakDays = 0;
            var checkDate = DateOnly.FromDateTime(userLocalNow);
            if (!distinctDates.Contains(checkDate))
            {
                checkDate = checkDate.AddDays(-1);
            }
            while (distinctDates.Contains(checkDate))
            {
                streakDays++;
                checkDate = checkDate.AddDays(-1);
            }

            return new
            {
                UserName = user?.name ?? "User",
                IsAdmin = user?.is_admin ?? false,
                PendingTasks = totalPendingTasks,
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                CompletionRate = completionRate,
                DailyAvg = $"{dailyAvgHours:0.#}h",
                TotalSessions = completedTasks,
                StreakDays = streakDays,
                TotalCategories = await GetCategoryCountAsync(),
                TodayTasks = todayTasks,
                TodayTimetable = todayTimetable
            };
        }

        private async Task<int> GetCategoryCountAsync()
        {
            string sql = "SELECT COUNT(*) FROM task_category WHERE is_deleted = FALSE";
            return await _db.ExecuteScalarAsync<int>(sql);
        }

        public async Task<TimetableItem?> GetActiveFocusAsync(int userId, int? timezoneOffsetMinutes = null)
        {
            int offset = timezoneOffsetMinutes ?? 0;
            var userLocalNow = DateTime.UtcNow.AddMinutes(-offset);
            int currentDayOfWeek = (int)userLocalNow.DayOfWeek;
            TimeSpan currentTime = userLocalNow.TimeOfDay;

            string sql = @"
                SELECT i.*, 
                       COALESCE(s.name, c.name) as TaskName, 
                       COALESCE(s.name, c.name) as Title,
                       c.name as CategoryName,
                       s.name as SubtypeName,
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

            return await _db.QuerySingleOrDefaultAsync<TimetableItem>(sql, new
            {
                UserId = userId,
                Day = currentDayOfWeek,
                Time = currentTime
            });
        }
    }
}
