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

        public async Task<DashboardStatsResponse> GetDashboardStatsAsync(int userId, ClientTimeZone timeZone)
        {
            DateTime utcNow = DateTime.UtcNow;
            var userLocalNow = timeZone.ToLocal(utcNow);
            int todayDayOfWeek = (int)userLocalNow.DayOfWeek;

            var today = DateOnly.FromDateTime(userLocalNow);
            var (startOfDayUtc, endOfDayUtc) = timeZone.LocalDateBoundsUtc(today);

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
                  AND (i.specific_date IS NULL OR i.specific_date = @Today)
                ORDER BY i.start_time ASC";

            var todayTimetable = (await _db.QueryAsync<dynamic>(sqlTodayTimetable, new 
            { 
                UserId = userId, 
                DayOfWeek = todayDayOfWeek,
                Today = today
            }))?.ToList() ?? new();

            // Mobile-optimized stats calculation
            double completionRate = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks * 100.0, 1) : 0.0;

            string sqlFocusSeconds = @"
                SELECT COALESCE(SUM(duration_seconds), 0)
                FROM tasks
                WHERE created_by = @UserId AND is_deleted = FALSE AND is_completed = TRUE
                  AND duration_seconds IS NOT NULL
                  AND end_time >= @WeekStartUtc AND end_time < @EndOfDayUtc";
            double totalFocusSeconds = await _db.ExecuteScalarAsync<double>(sqlFocusSeconds, new
            {
                UserId = userId,
                WeekStartUtc = timeZone.StartOfLocalDateUtc(today.AddDays(-6)),
                EndOfDayUtc = endOfDayUtc
            });
            double dailyAvgHours = Math.Round(totalFocusSeconds / 3600.0 / 7, 1);

            // Streaks represent local dates with completed task events, not creation activity.
            var distinctDates = (await _db.QueryAsync<DateTime>(@"
                SELECT DISTINCT CASE
                    WHEN @TimeZoneId IS NOT NULL THEN (completed_on AT TIME ZONE @TimeZoneId)::date
                    ELSE ((completed_on AT TIME ZONE 'UTC') - (@Offset * INTERVAL '1 minute'))::date
                END
                FROM tasks 
                WHERE created_by = @UserId AND is_deleted = FALSE
                  AND is_completed = TRUE AND completed_on IS NOT NULL",
                new
                {
                    UserId = userId,
                    TimeZoneId = timeZone.IanaTimeZoneId,
                    Offset = timeZone.CurrentOffsetMinutes(utcNow)
                }))?.Select(d => DateOnly.FromDateTime(d)).ToHashSet() ?? new();

            return new DashboardStatsResponse
            {
                UserName = user?.name ?? "User",
                IsAdmin = user?.is_admin ?? false,
                PendingTasks = totalPendingTasks,
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                CompletionRate = completionRate,
                DailyAvg = $"{dailyAvgHours:0.#}h",
                StreakDays = CompletedTaskStreak.Calculate(distinctDates, today),
                TotalCategories = await GetCategoryCountAsync(),
                TodayTasks = todayTasks.Cast<dynamic>().ToList(),
                TodayTimetable = todayTimetable.Cast<dynamic>().ToList()
            };
        }

        private async Task<int> GetCategoryCountAsync()
        {
            string sql = "SELECT COUNT(*) FROM task_category WHERE is_deleted = FALSE";
            return await _db.ExecuteScalarAsync<int>(sql);
        }

        public async Task<TimetableItem?> GetActiveFocusAsync(int userId, ClientTimeZone timeZone)
        {
            var userLocalNow = timeZone.ToLocal(DateTime.UtcNow);
            int currentDayOfWeek = (int)userLocalNow.DayOfWeek;
            TimeSpan currentTime = userLocalNow.TimeOfDay;
            var today = DateOnly.FromDateTime(userLocalNow);

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
                  AND (i.specific_date IS NULL OR i.specific_date = @Today)
                  AND i.day_of_week = @Day
                  AND i.start_time <= @Time 
                  AND i.end_time > @Time
                ORDER BY i.start_time
                LIMIT 1";

            return await _db.QuerySingleOrDefaultAsync<TimetableItem>(sql, new
            {
                UserId = userId,
                Day = currentDayOfWeek,
                Time = currentTime,
                Today = today
            });
        }
    }
}
