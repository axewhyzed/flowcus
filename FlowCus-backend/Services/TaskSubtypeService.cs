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

        // Add Delete if needed, following similar pattern
    }
}