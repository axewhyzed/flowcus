using FlowCus.Controllers;
using FlowCus.Helpers;
using FlowCus.Models;
using System.Threading.Tasks;

namespace FlowCus.Services
{
    public class UserService
    {
        private readonly DBHelper _db;

        public UserService(DBHelper db)
        {
            _db = db;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            string sql = "SELECT * FROM userlist WHERE id = @Id LIMIT 1";
            return await _db.QuerySingleAsync<User>(sql, new { Id = id });
        }

        public async Task<int> UpdateNameAsync(int userId, string name)
        {
            string sql = "UPDATE userlist SET name = @Name, updated_on = now() WHERE id = @UserId AND is_deleted = FALSE";
            return await _db.ExecuteAsync(sql, new { Name = name, UserId = userId });
        }

        public async Task<bool> CheckUsernameExistsAsync(string username)
        {
            string sql = "SELECT COUNT(*) FROM userlist WHERE username = @Username";
            long count = await _db.ExecuteScalarAsync<long>(sql, new { Username = username });
            return count > 0;
        }

        public async Task<User?> CreateUserAsync(UserCreateRequest request)
        {
            // Updated to use Dapper QuerySingleAsync
            string sql = @"
                INSERT INTO userlist (username, name, is_admin, created_on)
                VALUES (@Username, @Name, @IsAdmin, now())
                RETURNING id, username, name, created_on, is_admin, password_hash, failed_attempts, lockout_until, updated_on
            ";

            // Note: We select all fields to match the User model, handling nulls for optional fields
            return await _db.QuerySingleAsync<User>(sql, new
            {
                Username = request.Username,
                Name = request.Name,
                IsAdmin = request.IsAdmin
            });
        }
    }
}