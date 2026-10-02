using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FlowCus.Services
{
    public class TimetableService : ITimetableService
    {
        private readonly IDbHelper _db;
        public TimetableService(IDbHelper db) { _db = db; }

        public async Task<IEnumerable<Timetable>> GetAllAsync(int userId)
        {
            string sql = "SELECT * FROM timetables WHERE user_id = @UserId AND is_deleted = FALSE ORDER BY created_at DESC";
            return await _db.QueryAsync<Timetable>(sql, new { UserId = userId });
        }

        public async Task<int> CreateAsync(Timetable timetable)
        {
            ValidateTimetableName(timetable.Name);

            string sql = @"
                INSERT INTO timetables (user_id, name, is_active, created_at, is_deleted) 
                VALUES (@UserId, @Name, FALSE, now(), FALSE) 
                RETURNING id";
            int id = await _db.ExecuteScalarAsync<int>(sql, timetable);

            if (timetable.IsActive)
            {
                await ActivateTimetableAsync(id, timetable.UserId);
            }

            return id;
        }

        public async Task<bool> ActivateTimetableAsync(int timetableId, int userId)
        {
            string checkSql = "SELECT COUNT(*) FROM timetables WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE";
            long count = await _db.ExecuteScalarAsync<long>(checkSql, new { Id = timetableId, UserId = userId });

            if (count == 0) return false;

            string sql = @"
                UPDATE timetables
                SET is_active = CASE WHEN id = @Id THEN TRUE ELSE FALSE END,
                    updated_on = now()
                WHERE user_id = @UserId AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, new { Id = timetableId, UserId = userId });
            return rows > 0;
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
                       c.name as CategoryName,
                       s.name as SubtypeName,
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

        public async Task<int> CreateItemAsync(TimetableItem item, int userId)
        {
            ValidateItemShape(item);
            await ValidateItemReferencesAsync(item.TaskCategoryId, item.TaskSubtypeId, userId);

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
            ValidateItemShape(item);
            await ValidateItemReferencesAsync(item.TaskCategoryId, item.TaskSubtypeId, userId);

            var existingItem = await _db.QuerySingleAsync<TimetableItem>(@"
                SELECT i.*
                FROM timetable_items i
                JOIN timetables t ON i.timetable_id = t.id
                WHERE i.id = @Id
                AND t.user_id = @UserId
                AND i.is_deleted = FALSE
                AND t.is_deleted = FALSE",
                new { Id = id, UserId = userId });

            if (existingItem == null)
                return false;

            // CHECK FOR OVERLAPS (excluding current item)
            string overlapSql = @"
                    SELECT COUNT(*) FROM timetable_items 
                    WHERE timetable_id = @TimetableId 
                    AND day_of_week = @DayOfWeek 
                    AND id != @Id
                    AND is_deleted = FALSE
                    AND (start_time < @EndTime AND end_time > @StartTime)
                    ";

            long overlapCount = await _db.ExecuteScalarAsync<long>(overlapSql, new
            {
                TimetableId = existingItem.TimetableId,
                DayOfWeek = item.DayOfWeek,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Id = id
            });

            if (overlapCount > 0)
                throw new InvalidOperationException("Time slot overlaps with an existing event on this day.");

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
            ValidateTimetableName(name);

            string sql = @"
                UPDATE timetables 
                SET name = @Name,
                    updated_on = now()
                WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE
            ";

            int rows = await _db.ExecuteAsync(sql, new { Id = id, Name = name, UserId = userId });
            return rows > 0;
        }

        public async Task<bool> DeactivateTimetableAsync(int timetableId, int userId)
        {
            string sql = @"
                UPDATE timetables
                SET is_active = FALSE,
                    updated_on = now()
                WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, new { Id = timetableId, UserId = userId });
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            // Atomically soft-delete items belonging to the user's timetable, then the timetable itself
            string deleteSql = @"
                UPDATE timetable_items 
                SET is_deleted = TRUE, updated_on = now()
                FROM timetables t
                WHERE timetable_items.timetable_id = t.id 
                  AND t.id = @Id 
                  AND t.user_id = @UserId 
                  AND timetable_items.is_deleted = FALSE;

                UPDATE timetables 
                SET is_deleted = TRUE, updated_on = now() 
                WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE;";

            int rows = await _db.ExecuteAsync(deleteSql, new { Id = id, UserId = userId });
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

        private async Task ValidateItemReferencesAsync(int categoryId, int? subtypeId, int userId)
        {
            long categoryCount = await _db.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM task_category WHERE id = @Id AND is_deleted = FALSE",
                new { Id = categoryId });

            if (categoryCount == 0)
                throw new InvalidOperationException("Selected task category does not exist.");

            if (!subtypeId.HasValue)
                return;

            TaskSubtype? subtype = await _db.QuerySingleAsync<TaskSubtype>(
                "SELECT * FROM task_subtypes WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE",
                new { Id = subtypeId.Value, UserId = userId });

            if (subtype == null)
                throw new InvalidOperationException("Selected task subtype does not exist.");

            if (subtype.CategoryId != categoryId)
                throw new InvalidOperationException("Selected task subtype does not belong to the chosen category.");
        }

        public async Task<object> ApplyTemplateAsync(string templateName, int userId)
        {
            string routineName = (templateName ?? "general").Trim().ToLowerInvariant() switch
            {
                "student" => "University Semester Routine",
                "developer" => "Software Engineering Routine",
                "freelancer" => "Freelance & Creator Routine",
                _ => "Balanced Productivity Routine"
            };

            var categories = (await _db.QueryAsync<TaskCategory>(
                "SELECT * FROM task_category WHERE is_deleted = FALSE")).ToList();

            int GetCatId(string preferredName, string fallback = "Work")
            {
                var match = categories.FirstOrDefault(c => c.Name.Equals(preferredName, StringComparison.OrdinalIgnoreCase))
                         ?? categories.FirstOrDefault(c => c.Name.Equals(fallback, StringComparison.OrdinalIgnoreCase))
                         ?? categories.FirstOrDefault();
                return match != null ? match.Id : 1;
            }

            int workCat = GetCatId("Work");
            int studyCat = GetCatId("Study", "Work");
            int fitnessCat = GetCatId("Fitness", "Personal");
            int personalCat = GetCatId("Personal", "Work");
            int meetingCat = GetCatId("Meeting", "Work");

            long currentCount = await _db.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM timetables WHERE user_id = @UserId AND is_deleted = FALSE", new { UserId = userId });

            if (currentCount >= 5)
            {
                await _db.ExecuteAsync(@"
                    UPDATE timetables 
                    SET is_deleted = TRUE, is_active = FALSE, updated_on = now() 
                    WHERE id = (
                        SELECT id FROM timetables 
                        WHERE user_id = @UserId AND is_deleted = FALSE AND is_active = FALSE 
                        ORDER BY created_at ASC LIMIT 1
                    )", new { UserId = userId });
            }

            int timetableId = await CreateAsync(new Timetable
            {
                UserId = userId,
                Name = routineName,
                IsActive = true
            });

            var itemsToInsert = new List<(int day, string start, string end, int catId)>();
            string mode = (templateName ?? "general").Trim().ToLowerInvariant();

            if (mode == "student")
            {
                for (int d = 1; d <= 5; d++)
                {
                    itemsToInsert.Add((d, "09:00:00", "12:00:00", studyCat));
                    itemsToInsert.Add((d, "12:00:00", "13:00:00", personalCat));
                    itemsToInsert.Add((d, "13:00:00", "16:00:00", studyCat));
                    itemsToInsert.Add((d, "17:00:00", "18:30:00", fitnessCat));
                    itemsToInsert.Add((d, "19:30:00", "21:30:00", studyCat));
                }
            }
            else if (mode == "developer")
            {
                for (int d = 1; d <= 5; d++)
                {
                    itemsToInsert.Add((d, "09:00:00", "12:00:00", workCat));
                    itemsToInsert.Add((d, "12:00:00", "13:00:00", personalCat));
                    itemsToInsert.Add((d, "13:00:00", "14:00:00", workCat));
                    itemsToInsert.Add((d, "14:00:00", "16:30:00", workCat));
                    itemsToInsert.Add((d, "17:00:00", "18:00:00", fitnessCat));
                }
            }
            else if (mode == "freelancer")
            {
                for (int d = 1; d <= 5; d++)
                {
                    itemsToInsert.Add((d, "08:30:00", "11:30:00", workCat));
                    itemsToInsert.Add((d, "11:30:00", "12:30:00", meetingCat));
                    itemsToInsert.Add((d, "13:30:00", "16:00:00", workCat));
                    itemsToInsert.Add((d, "16:30:00", "17:30:00", fitnessCat));
                }
            }
            else
            {
                for (int d = 1; d <= 7; d++)
                {
                    int day = d % 7;
                    itemsToInsert.Add((day, "09:00:00", "12:00:00", workCat));
                    itemsToInsert.Add((day, "13:30:00", "16:30:00", workCat));
                    itemsToInsert.Add((day, "17:30:00", "18:30:00", fitnessCat));
                }
            }

            foreach (var (day, start, end, catId) in itemsToInsert)
            {
                await _db.ExecuteAsync(@"
                    INSERT INTO timetable_items (timetable_id, task_category_id, day_of_week, start_time, end_time, created_on, is_deleted)
                    VALUES (@TId, @CatId, @Day, @Start::time, @End::time, now(), FALSE)",
                    new { TId = timetableId, CatId = catId, Day = day, Start = start, End = end });
            }

            return new
            {
                timetableId,
                name = routineName,
                itemCount = itemsToInsert.Count,
                message = $"Applied {routineName} template with {itemsToInsert.Count} scheduled blocks!"
            };
        }

        public async Task<int> ShiftTodayAsync(int minutes, int userId, int? dayOfWeek = null)
        {
            var activeTimetable = await _db.QuerySingleOrDefaultAsync<Timetable>(
                "SELECT * FROM timetables WHERE user_id = @UserId AND is_active = TRUE AND is_deleted = FALSE LIMIT 1",
                new { UserId = userId });

            if (activeTimetable == null) return 0;

            int day = dayOfWeek ?? (int)DateTime.UtcNow.DayOfWeek;
            string sql = @"
                UPDATE timetable_items
                SET start_time = LEAST('23:59:59'::time, start_time + (@Minutes || ' minutes')::interval),
                    end_time = LEAST('23:59:59'::time, end_time + (@Minutes || ' minutes')::interval),
                    updated_on = now()
                WHERE timetable_id = @TId 
                  AND day_of_week = @Day 
                  AND is_deleted = FALSE;";

            return await _db.ExecuteAsync(sql, new { TId = activeTimetable.Id, Day = day, Minutes = minutes });
        }

        private static void ValidateTimetableName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new InvalidOperationException("Timetable name is required.");
        }

        private static void ValidateItemShape(TimetableItem item)
        {
            if (item.TaskCategoryId <= 0)
                throw new InvalidOperationException("Task category is required.");

            if (item.DayOfWeek < 0 || item.DayOfWeek > 6)
                throw new InvalidOperationException("Day of week must be between 0 and 6.");

            if (item.StartTime >= item.EndTime)
                throw new InvalidOperationException("Start time must be before end time.");
        }
    }
}
