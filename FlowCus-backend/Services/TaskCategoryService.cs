using FlowCus.Helpers;
using FlowCus.Models;
using Dapper;
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
            string sql = @"
                INSERT INTO task_category (name, description, color_hex, icon_name, created_on, is_deleted)
                VALUES (@Name, @Description, @ColorHex, @IconName, now(), FALSE)
                RETURNING id;";
            return await _db.ExecuteScalarAsync<int>(sql, category);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            string sql = "UPDATE task_category SET is_deleted = TRUE WHERE id = @Id";
            int rows = await _db.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }
    }
}