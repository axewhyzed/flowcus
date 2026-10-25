using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using Dapper;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FlowCus.Services
{
    public class TaskService : ITaskService
    {
        private readonly IDbHelper _db;
        public TaskService(IDbHelper db) { _db = db; }

        public async Task<IEnumerable<TaskEntity>> GetAllAsync(int userId)
        {
            string sql = "SELECT * FROM tasks WHERE created_by = @CreatedBy AND is_deleted = FALSE ORDER BY created_on DESC";
            return await _db.QueryAsync<TaskEntity>(sql, new { CreatedBy = userId });
        }

        public async Task<int> CreateAsync(TaskEntity task, string? idempotencyKey = null)
        {
            ValidateTask(task);
            string sql = @"
                INSERT INTO tasks (created_by, task_category_id, task_subtype_id, title, description, priority, 
                                   start_time, end_time, is_completed, created_on, completed_on, is_deleted, idempotency_key, request_hash)
                VALUES (@CreatedBy, @TaskCategoryId, @TaskSubtypeId, @Title, @Description, @Priority, 
                        @StartTime, @EndTime, @IsCompleted, now(), CASE WHEN @IsCompleted THEN now() ELSE NULL END,
                        FALSE, @IdempotencyKey, @RequestHash)
                ON CONFLICT (created_by, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
                RETURNING task_id;";
            if (idempotencyKey == null)
            {
                await ValidateReferencesAsync(task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId);
                return await _db.ExecuteScalarAsync<int>(sql, new { task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId,
                    task.Title, task.Description, task.Priority, task.StartTime, task.EndTime, task.IsCompleted,
                    IdempotencyKey = (string?)null, RequestHash = (string?)null });
            }

            string requestHash = TaskRequestHasher.Hash(task);
            return await _db.ExecuteInTransactionAsync(async (connection, transaction) =>
            {
                var existing = await connection.QuerySingleOrDefaultAsync<IdempotencyRecord>(@"
                    SELECT task_id AS TaskId, request_hash AS RequestHash, is_deleted AS IsDeleted
                    FROM tasks WHERE created_by = @CreatedBy AND idempotency_key = @IdempotencyKey",
                    new { task.CreatedBy, IdempotencyKey = idempotencyKey }, transaction);
                if (existing != null)
                    return ResolveIdempotencyReplay(existing, requestHash);

                long categoryCount = await connection.ExecuteScalarAsync<long>(
                    "SELECT COUNT(*) FROM task_category WHERE id = @Id AND is_deleted = FALSE",
                    new { Id = task.TaskCategoryId }, transaction);
                if (categoryCount == 0)
                    throw new InvalidOperationException("Selected task category does not exist.");

                if (task.TaskSubtypeId.HasValue)
                {
                    var subtype = await connection.QuerySingleOrDefaultAsync<TaskSubtype>(@"
                        SELECT * FROM task_subtypes
                        WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE",
                        new { Id = task.TaskSubtypeId.Value, UserId = task.CreatedBy }, transaction);
                    if (subtype == null)
                        throw new InvalidOperationException("Selected task subtype does not exist.");
                    if (subtype.CategoryId != task.TaskCategoryId)
                        throw new InvalidOperationException("Selected task subtype does not belong to the chosen category.");
                }

                int? newId = await connection.ExecuteScalarAsync<int?>(sql, new
                {
                    task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId, task.Title, task.Description,
                    task.Priority, task.StartTime, task.EndTime, task.IsCompleted,
                    IdempotencyKey = idempotencyKey,
                    RequestHash = requestHash
                }, transaction);

                if (newId.HasValue) return newId.Value;

                existing = await connection.QuerySingleOrDefaultAsync<IdempotencyRecord>(@"
                    SELECT task_id AS TaskId, request_hash AS RequestHash, is_deleted AS IsDeleted
                    FROM tasks WHERE created_by = @CreatedBy AND idempotency_key = @IdempotencyKey",
                    new { task.CreatedBy, IdempotencyKey = idempotencyKey }, transaction);
                if (existing == null)
                    throw new IdempotencyConflictException("This idempotency key has already been used.");
                return ResolveIdempotencyReplay(existing, requestHash);
            });
        }

        private static int ResolveIdempotencyReplay(IdempotencyRecord existing, string requestHash)
        {
            if (existing.IsDeleted)
                throw new IdempotencyConflictException("This idempotency key has already been used.");
            if (!string.Equals(existing.RequestHash, requestHash, StringComparison.Ordinal))
                throw new IdempotencyConflictException("This idempotency key was already used with a different task payload.");
            return existing.TaskId;
        }

        private sealed class IdempotencyRecord
        {
            public int TaskId { get; set; }
            public string? RequestHash { get; set; }
            public bool IsDeleted { get; set; }
        }

        public async Task<bool> UpdateAsync(TaskEntity task)
        {
            var current = await GetByIdAsync(task.TaskId, task.CreatedBy);
            if (current == null) return false;
            ValidateTask(task);
            if (task.TaskCategoryId != current.TaskCategoryId || task.TaskSubtypeId != current.TaskSubtypeId)
                await ValidateReferencesAsync(task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId);

            string sql = @"
                UPDATE tasks 
                SET title = @Title, 
                    description = @Description, 
                    priority = @Priority, 
                    task_category_id = @TaskCategoryId,
                    task_subtype_id = @TaskSubtypeId, 
                    start_time = @StartTime, 
                    end_time = @EndTime, 
                    is_completed = @IsCompleted,
                    completed_on = CASE WHEN @IsCompleted THEN COALESCE(completed_on, now()) ELSE NULL END,
                    updated_on = now()
                WHERE task_id = @TaskId AND created_by = @CreatedBy AND is_deleted = FALSE";
            int rows = await _db.ExecuteAsync(sql, task);
            return rows > 0;
        }

        public async Task<bool> PatchAsync(int id, int userId, TaskPatchRequest patch)
        {
            ArgumentNullException.ThrowIfNull(patch);
            var current = await GetByIdAsync(id, userId);
            if (current == null)
                return false;

            if (!patch.HasTitle && !patch.HasDescription && !patch.HasPriority &&
                !patch.HasTaskCategoryId && !patch.HasTaskSubtypeId && !patch.HasStartTime &&
                !patch.HasEndTime && !patch.HasIsCompleted)
                throw new InvalidOperationException("At least one task field must be supplied.");

            var updated = new TaskEntity
            {
                TaskId = id,
                CreatedBy = userId,
                Title = patch.HasTitle ? patch.Title : current.Title,
                Description = patch.HasDescription ? patch.Description : current.Description,
                Priority = patch.HasPriority ? patch.Priority : current.Priority,
                TaskCategoryId = patch.HasTaskCategoryId ? patch.TaskCategoryId ?? 0 : current.TaskCategoryId,
                TaskSubtypeId = patch.HasTaskSubtypeId ? patch.TaskSubtypeId : current.TaskSubtypeId,
                StartTime = patch.HasStartTime ? patch.StartTime : current.StartTime,
                EndTime = patch.HasEndTime ? patch.EndTime : current.EndTime,
                IsCompleted = patch.HasIsCompleted ? patch.IsCompleted ?? current.IsCompleted : current.IsCompleted
            };

            if (patch.HasTaskCategoryId && !patch.HasTaskSubtypeId && updated.TaskSubtypeId.HasValue)
            {
                var subtypeCategory = await _db.ExecuteScalarAsync<int?>(
                    "SELECT category_id FROM task_subtypes WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE",
                    new { Id = updated.TaskSubtypeId.Value, UserId = userId });
                if (subtypeCategory != updated.TaskCategoryId)
                    updated.TaskSubtypeId = null;
            }

            ValidateTask(updated);
            if (patch.HasTaskCategoryId || patch.HasTaskSubtypeId)
                await ValidateReferencesAsync(userId, updated.TaskCategoryId, updated.TaskSubtypeId);

            var parameters = new Dictionary<string, object?>
            {
                ["TaskId"] = id,
                ["UserId"] = userId,
                ["Title"] = updated.Title,
                ["Description"] = updated.Description,
                ["Priority"] = updated.Priority,
                ["TaskCategoryId"] = updated.TaskCategoryId,
                ["TaskSubtypeId"] = updated.TaskSubtypeId,
                ["StartTime"] = updated.StartTime,
                ["EndTime"] = updated.EndTime,
                ["IsCompleted"] = updated.IsCompleted
            };

            var assignments = new List<string>();
            if (patch.HasTitle) assignments.Add("title = @Title");
            if (patch.HasDescription) assignments.Add("description = @Description");
            if (patch.HasPriority) assignments.Add("priority = @Priority");
            if (patch.HasTaskCategoryId) assignments.Add("task_category_id = @TaskCategoryId");
            if (patch.HasTaskSubtypeId || (patch.HasTaskCategoryId && updated.TaskSubtypeId != current.TaskSubtypeId))
                assignments.Add("task_subtype_id = @TaskSubtypeId");
            if (patch.HasStartTime) assignments.Add("start_time = @StartTime");
            if (patch.HasEndTime) assignments.Add("end_time = @EndTime");
            if (patch.HasIsCompleted)
            {
                assignments.Add("is_completed = @IsCompleted");
                assignments.Add("completed_on = CASE WHEN @IsCompleted THEN COALESCE(completed_on, now()) ELSE NULL END");
            }
            assignments.Add("updated_on = now()");

            string sql = $@"UPDATE tasks SET {string.Join(", ", assignments)}
                WHERE task_id = @TaskId AND created_by = @UserId AND is_deleted = FALSE";
            return await _db.ExecuteAsync(sql, parameters) > 0;
        }

        public async Task<bool> ToggleCompleteAsync(int id, int userId, bool? isCompleted = null)
        {
            string sql = isCompleted.HasValue
                ? @"UPDATE tasks 
                    SET is_completed = @IsCompleted,
                        completed_on = CASE WHEN @IsCompleted THEN COALESCE(completed_on, now()) ELSE NULL END,
                        updated_on = now()
                    WHERE task_id = @Id AND created_by = @CreatedBy AND is_deleted = FALSE"
                : @"UPDATE tasks 
                    SET is_completed = NOT is_completed,
                        completed_on = CASE WHEN is_completed THEN NULL ELSE now() END,
                        updated_on = now()
                    WHERE task_id = @Id AND created_by = @CreatedBy AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, new { Id = id, CreatedBy = userId, IsCompleted = isCompleted });
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            string sql = "UPDATE tasks SET is_deleted = TRUE, updated_on = now() WHERE task_id = @Id AND created_by = @CreatedBy";
            int rows = await _db.ExecuteAsync(sql, new { Id = id, CreatedBy = userId });
            return rows > 0;
        }

        public async Task<TaskEntity?> GetByIdAsync(int id, int userId)
        {
            string sql = "SELECT * FROM tasks WHERE task_id = @Id AND created_by = @CreatedBy AND is_deleted = FALSE";
            return await _db.QuerySingleAsync<TaskEntity>(sql, new { Id = id, CreatedBy = userId });
        }

        private async Task ValidateReferencesAsync(int userId, int categoryId, int? subtypeId)
        {
            long categoryCount = await _db.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM task_category WHERE id = @Id AND is_deleted = FALSE",
                new { Id = categoryId });

            if (categoryCount == 0)
                throw new InvalidOperationException("Selected task category does not exist.");

            if (!subtypeId.HasValue)
                return;

            var subtype = await _db.QuerySingleOrDefaultAsync<TaskSubtype>(
                "SELECT * FROM task_subtypes WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE",
                new { Id = subtypeId.Value, UserId = userId });

            if (subtype == null)
                throw new InvalidOperationException("Selected task subtype does not exist.");

            if (subtype.CategoryId != categoryId)
                throw new InvalidOperationException("Selected task subtype does not belong to the chosen category.");
        }

        public async Task<int> RolloverYesterdayTasksAsync(int userId, ClientTimeZone timeZone, DateTime utcNow)
        {
            DateOnly localToday = DateOnly.FromDateTime(timeZone.ToLocal(utcNow));
            DateOnly localYesterday = localToday.AddDays(-1);
            var (yesterdayStartUtc, todayStartUtc) = timeZone.LocalDateBoundsUtc(localYesterday);

            return await _db.ExecuteInTransactionAsync(async (connection, transaction) =>
            {
                var candidates = (await connection.QueryAsync<RolloverCandidate>(@"
                    SELECT task_id AS TaskId, start_time AS StartTime, end_time AS EndTime
                    FROM tasks
                    WHERE created_by = @UserId
                      AND is_deleted = FALSE
                      AND is_completed = FALSE
                      AND start_time >= @YesterdayStartUtc
                      AND start_time < @TodayStartUtc
                    ORDER BY task_id
                    FOR UPDATE;",
                    new
                    {
                        UserId = userId,
                        YesterdayStartUtc = yesterdayStartUtc,
                        TodayStartUtc = todayStartUtc
                    }, transaction)).ToList();

                foreach (var task in candidates)
                {
                    var shifted = timeZone.ShiftTaskToNextLocalDate(task.StartTime, task.EndTime);
                    await connection.ExecuteAsync(@"
                        UPDATE tasks
                        SET start_time = @StartTime,
                            end_time = @EndTime,
                            updated_on = now()
                        WHERE task_id = @TaskId
                          AND created_by = @UserId
                          AND is_deleted = FALSE
                          AND is_completed = FALSE;",
                        new
                        {
                            task.TaskId,
                            UserId = userId,
                            StartTime = shifted.StartUtc,
                            EndTime = shifted.EndUtc
                        }, transaction);
                }

                return candidates.Count;
            });
        }

        private sealed class RolloverCandidate
        {
            public int TaskId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
        }

        private static void ValidateTask(TaskEntity task)
        {
            if (string.IsNullOrWhiteSpace(task.Title))
                throw new InvalidOperationException("Task title is required.");

            if (task.Priority.HasValue && (task.Priority < 1 || task.Priority > 5))
                throw new InvalidOperationException("Priority must be between 1 and 5.");

            if (task.StartTime.HasValue && task.EndTime.HasValue && task.StartTime > task.EndTime)
                throw new InvalidOperationException("Task start time cannot be after end time.");
        }
    }
}
