using FlowCus.Helpers;
using FlowCus.Models;
using Dapper;

namespace FlowCus.Services
{
    public class TaskSubtypeService
    {
        private readonly DBHelper _db;
        public TaskSubtypeService(DBHelper db) { _db = db; }

        public async Task<IEnumerable<TaskSubtype>> GetByStartLetterAsync(string letter, int userId)
        {
            string sql = @"
                SELECT * FROM task_subtypes 
                WHERE user_id = @UserId 
                AND is_deleted = FALSE 
                AND name ILIKE @Pattern 
                ORDER BY name";
            return await _db.QueryAsync<TaskSubtype>(sql, new { UserId = userId, Pattern = $"{letter}%" });
        }

        public async Task<int> CreateAsync(TaskSubtype subtype)
        {
            // Note: Your DB likely has a trigger/function 'enforce_subtype_limit'
            // We just insert, and if the DB raises an error, we catch it in Controller.
            string sql = @"
                INSERT INTO task_subtypes (user_id, category_id, name, created_on)
                VALUES (@UserId, @CategoryId, @Name, now())
                RETURNING id;";
            return await _db.ExecuteScalarAsync<int>(sql, subtype);
        }

        public async Task<TaskSubtype?> GetByIdAsync(int id, int userId)
        {
            string sql = "SELECT * FROM task_subtypes WHERE id = @Id AND user_id = @UserId AND is_deleted = FALSE";
            return await _db.QuerySingleAsync<TaskSubtype>(sql, new { Id = id, UserId = userId });
        }

        public async Task<IEnumerable<TaskSubtype>> GetAllAsync(int userId)
        {
            string sql = "SELECT * FROM task_subtypes WHERE user_id = @UserId AND is_deleted = FALSE ORDER BY name";
            return await _db.QueryAsync<TaskSubtype>(sql, new { UserId = userId });
        }

        public async Task<bool> UpdateAsync(TaskSubtype subtype)
        {
            string sql = @"
        UPDATE task_subtypes 
        SET name = @Name, 
            description = @Description, 
            color_hex = @ColorHex, 
            icon_name = @IconName,
            updated_on = now()
        WHERE id = @Id AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, new
            {
                Id = subtype.Id,
                Name = subtype.Name,
                Description = subtype.Description,
                ColorHex = subtype.ColorHex,
                IconName = subtype.IconName
            });

            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            string sql = "UPDATE task_subtypes SET is_deleted = TRUE, updated_on = now() WHERE id = @Id";
            int rows = await _db.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }
    }
}