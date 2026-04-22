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

            // wrap in transaction to prevent race condition where brief window with no active timetable occurs
            // Also prevents scenario where two concurrent activations both see 0 active, then both set themselves active
            string transactionSql = @"
                BEGIN TRANSACTION;
                
                UPDATE timetables SET is_active = FALSE WHERE user_id = @UserId;
                UPDATE timetables SET is_active = TRUE WHERE id = @Id;
                
                COMMIT;
            ";
            
            await _db.ExecuteAsync(transactionSql, new { Id = timetableId, UserId = userId });
            return true;
        }

        public async Task<Timetable?> GetByIdAsync(int id, int userId)
        {
            string sql = "SELECT * FROM timetables WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE";
            return await _db.QuerySingleAsync<Timetable>(sql, new { Id = id, UserId = userId });
        }

        public async Task<IEnumerable<TimetableItem>> GetItemsAsync(int timetableId, int userId)
        {
            // FIX: Join task_subtypes (s) and use COALESCE to prefer Subtype details if they exist
            string sql = @"
                SELECT i.*, 
                       COALESCE(s.name, c.name) as TaskName, 
                       COALESCE(s.color_hex, c.color_hex) as ColorHex 
                FROM timetable_items i
                JOIN timetables t ON i.timetable_id = t.id
                LEFT JOIN task_category c ON i.task_category_id = c.id
                LEFT JOIN task_subtypes s ON i.task_subtype_id = s.id
                WHERE t.id = @TId AND t.user_id = @UserId AND i.is_deleted = FALSE
                ORDER BY i.day_of_week, i.start_time";

            return await _db.QueryAsync<TimetableItem>(sql, new { TId = timetableId, UserId = userId });
        }

        public async Task<int> CreateItemAsync(TimetableItem item)
        {
            // SECURITY FIX: Check for overlapping time slots on same day in this timetable
            string overlapSql = @"
                SELECT COUNT(*) FROM timetable_items 
                WHERE timetable_id = @TimetableId 
                AND day_of_week = @DayOfWeek 
                AND is_deleted = FALSE
                AND (
                    (start_time < @EndTime AND end_time > @StartTime)
                )
            ";

            long overlapCount = await _db.ExecuteScalarAsync<long>(overlapSql, new
            {
                TimetableId = item.TimetableId,
                DayOfWeek = item.DayOfWeek,
                StartTime = item.StartTime,
                EndTime = item.EndTime
            });

            if (overlapCount > 0)
            {
                throw new InvalidOperationException("Time slot overlaps with an existing event on this day.");
            }

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

        public async Task<bool> UpdateAsync(int id, string name, int userId)
        {
            string sql = @"
                UPDATE timetables 
                SET name = @Name 
                WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE
            ";

            int rows = await _db.ExecuteAsync(sql, new { Id = id, Name = name, UserId = userId });
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            // Soft delete the timetable and cascade cascade deletes its items
            string sql = @"
                UPDATE timetables 
                SET is_deleted = TRUE 
                WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE
            ";

            int rows = await _db.ExecuteAsync(sql, new { Id = id, UserId = userId });
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