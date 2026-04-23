using FlowCus.Helpers;
using FlowCus.Models;
using Dapper;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FlowCus.Services
{
    public class TaskService
    {
        private readonly DBHelper _db;
        public TaskService(DBHelper db) { _db = db; }

        public async Task<IEnumerable<TaskEntity>> GetAllAsync(int userId)
        {
            string sql = "SELECT * FROM tasks WHERE created_by = @CreatedBy AND is_deleted = FALSE ORDER BY created_on DESC";
            return await _db.QueryAsync<TaskEntity>(sql, new { CreatedBy = userId });
        }

        public async Task<int> CreateAsync(TaskEntity task)
        {
            await ValidateReferencesAsync(task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId);

            string sql = @"
                INSERT INTO tasks (created_by, task_category_id, task_subtype_id, title, description, priority, 
                                   start_time, end_time, created_on, is_deleted)
                VALUES (@CreatedBy, @TaskCategoryId, @TaskSubtypeId, @Title, @Description, @Priority, 
                        @StartTime, @EndTime, now(), FALSE)
                RETURNING task_id;";
            return await _db.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<bool> UpdateAsync(TaskEntity task)
        {
            await ValidateReferencesAsync(task.CreatedBy, task.TaskCategoryId, task.TaskSubtypeId);

            string sql = @"
                UPDATE tasks 
                SET title = @Title, description = @Description, priority = @Priority, task_category_id = @TaskCategoryId,
                    task_subtype_id = @TaskSubtypeId, start_time = @StartTime, end_time = @EndTime, updated_on = now()
                WHERE task_id = @TaskId AND created_by = @CreatedBy AND is_deleted = FALSE";
            int rows = await _db.ExecuteAsync(sql, task);
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

            var subtype = await _db.QuerySingleAsync<TaskSubtype>(
                "SELECT * FROM task_subtypes WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE",
                new { Id = subtypeId.Value, UserId = userId });

            if (subtype == null)
                throw new InvalidOperationException("Selected task subtype does not exist.");

            if (subtype.CategoryId != categoryId)
                throw new InvalidOperationException("Selected task subtype does not belong to the chosen category.");
        }
    }
}
