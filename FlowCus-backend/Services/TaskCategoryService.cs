using FlowCus.Helpers;
using FlowCus.Models;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FlowCus.Services
{
    public class TaskCategoryService
    {
        private readonly DBHelper _db;

        public TaskCategoryService(DBHelper db) { _db = db; }

        public async Task<IEnumerable<TaskCategory>> GetAllAsync()
        {
            // Categories seem to be global (no user_id in schema)
            string sql = "SELECT * FROM task_category WHERE is_deleted = FALSE ORDER BY name";
            return await _db.QueryAsync<TaskCategory>(sql);
        }

        public async Task<int> CreateAsync(TaskCategory category)
        {
            Validate(category);

            string sql = @"
                INSERT INTO task_category (name, description, color_hex, icon_name, created_on, is_deleted)
                VALUES (@Name, @Description, @ColorHex, @IconName, now(), FALSE)
                RETURNING id;";
            return await _db.ExecuteScalarAsync<int>(sql, category);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            long referenceCount = await _db.ExecuteScalarAsync<long>(@"
                SELECT
                    (SELECT COUNT(*) FROM tasks WHERE task_category_id = @Id AND is_deleted = FALSE) +
                    (SELECT COUNT(*) FROM task_subtypes WHERE category_id = @Id AND is_deleted = FALSE) +
                    (SELECT COUNT(*) FROM timetable_items WHERE task_category_id = @Id AND is_deleted = FALSE)",
                new { Id = id });

            if (referenceCount > 0)
                throw new InvalidOperationException("Category is still used by tasks, subcategories, or timetable items.");

            string sql = "UPDATE task_category SET is_deleted = TRUE WHERE id = @Id";
            int rows = await _db.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }

        public async Task<TaskCategory?> GetByIdAsync(int id)
        {
            string sql = "SELECT * FROM task_category WHERE id = @Id AND is_deleted = FALSE";
            return await _db.QuerySingleAsync<TaskCategory>(sql, new { Id = id });
        }

        public async Task<bool> UpdateAsync(TaskCategory category)
        {
            Validate(category);

            string sql = @"
        UPDATE task_category 
        SET name = @Name, 
            description = @Description, 
            color_hex = @ColorHex, 
            icon_name = @IconName,
            updated_on = now()
        WHERE id = @Id AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, new
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                ColorHex = category.ColorHex,
                IconName = category.IconName
            });

            return rows > 0;
        }

        private static void Validate(TaskCategory category)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
                throw new InvalidOperationException("Category name is required.");
        }
    }
}
