using FlowCus.Helpers;
using FlowCus.Models;
using Dapper;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FlowCus.Services
{
    public class TimetableService
    {
        private readonly DBHelper _db;
        public TimetableService(DBHelper db) { _db = db; }

        public async Task<IEnumerable<Timetable>> GetAllAsync(int userId)
        {
            string sql = "SELECT * FROM timetables WHERE user_id = @UserId AND is_deleted = FALSE ORDER BY created_at DESC";
            return await _db.QueryAsync<Timetable>(sql, new { UserId = userId });
        }

        public async Task<int> CreateAsync(Timetable t)
        {
            string sql = @"
                INSERT INTO timetables (user_id, name, is_active, created_at, is_deleted) 
                VALUES (@UserId, @Name, FALSE, now(), FALSE) 
                RETURNING id";
            return await _db.ExecuteScalarAsync<int>(sql, t);
        }

        public async Task<bool> ActivateTimetableAsync(int timetableId, int userId)
        {
            // 1. Verify timetable exists and belongs to user
            string checkSql = "SELECT COUNT(*) FROM timetables WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE";
            long count = await _db.ExecuteScalarAsync<long>(checkSql, new { Id = timetableId, UserId = userId });

            if (count == 0) return false;

            // 2. Deactivate all timetables for this user first
            string deactivateSql = "UPDATE timetables SET is_active = FALSE WHERE user_id = @UserId";
            await _db.ExecuteAsync(deactivateSql, new { UserId = userId });

            // 3. Activate the specific timetable
            string activateSql = "UPDATE timetables SET is_active = TRUE WHERE id = @Id";
            await _db.ExecuteAsync(activateSql, new { Id = timetableId });

            return true;
        }

        public async Task<IEnumerable<TimetableItem>> GetItemsAsync(int timetableId, int userId)
        {
            // JOIN with task_category to get the 'TaskName' (category name) and Color for display
            string sql = @"
                SELECT i.*, 
                       c.name as TaskName, 
                       c.color_hex as ColorHex 
                FROM timetable_items i
                JOIN timetables t ON i.timetable_id = t.id
                LEFT JOIN task_category c ON i.task_category_id = c.id
                WHERE t.id = @TId AND t.user_id = @UserId AND i.is_deleted = FALSE
                ORDER BY i.day_of_week, i.start_time";

            return await _db.QueryAsync<TimetableItem>(sql, new { TId = timetableId, UserId = userId });
        }

        public async Task<int> CreateItemAsync(TimetableItem item)
        {
            // Note: @TaskSubtypeId will be DBNull if item.TaskSubtypeId is null.
            string sql = @"
                INSERT INTO timetable_items 
                (timetable_id, task_category_id, task_subtype_id, day_of_week, start_time, end_time, specific_date, is_deleted)
                VALUES 
                (@TimetableId, @TaskCategoryId, @TaskSubtypeId, @DayOfWeek, @StartTime, @EndTime, @SpecificDate, FALSE)
                RETURNING id";
            return await _db.ExecuteScalarAsync<int>(sql, item);
        }

        public async Task<bool> UpdateItemAsync(int id, TimetableItem item, int userId)
        {
            string sql = @"
                UPDATE timetable_items 
                SET task_category_id = @TaskCategoryId, 
                    task_subtype_id = @TaskSubtypeId,
                    day_of_week = @DayOfWeek,
                    start_time = @StartTime, 
                    end_time = @EndTime, 
                    specific_date = @SpecificDate
                FROM timetables t
                WHERE timetable_items.id = @Id 
                AND timetable_items.timetable_id = t.id 
                AND t.user_id = @UserId";

            // Combine ID/UserId with the item properties for Dapper params
            var paramsObj = new
            {
                Id = id,
                UserId = userId,
                item.TaskCategoryId,
                item.TaskSubtypeId,
                item.DayOfWeek,
                item.StartTime,
                item.EndTime,
                item.SpecificDate
            };

            int rows = await _db.ExecuteAsync(sql, paramsObj);
            return rows > 0;
        }

        public async Task<bool> DeleteItemAsync(int id, int userId)
        {
            string sql = @"
                UPDATE timetable_items 
                SET is_deleted = TRUE 
                FROM timetables t
                WHERE timetable_items.id = @Id 
                AND timetable_items.timetable_id = t.id 
                AND t.user_id = @UserId";

            int rows = await _db.ExecuteAsync(sql, new { Id = id, UserId = userId });
            return rows > 0;
        }
    }
}