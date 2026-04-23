using FlowCus.Controllers;
using FlowCus.Helpers;
using FlowCus.Models;
using System.Threading.Tasks;

namespace FlowCus.Services
{
    public class UserService
    {
        private readonly DBHelper _db;
        private readonly int _bcryptWorkFactor;

        public UserService(DBHelper db, IConfiguration configuration)
        {
            _db = db;
            _bcryptWorkFactor = int.Parse(configuration["AuthSettings:BcryptWorkFactor"] ?? "12");
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            string sql = "SELECT * FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1";
            return await _db.QuerySingleAsync<User>(sql, new { Id = id });
        }

        public async Task<int> UpdateNameAsync(int userId, string name)
        {
            string sql = "UPDATE userlist SET name = @Name, updated_on = now() WHERE id = @UserId AND is_deleted = FALSE";
            return await _db.ExecuteAsync(sql, new { Name = name, UserId = userId });
        }

        public async Task<bool> CheckUsernameExistsAsync(string username)
        {
            string sql = "SELECT COUNT(*) FROM userlist WHERE username = @Username AND is_deleted = FALSE";
            long count = await _db.ExecuteScalarAsync<long>(sql, new { Username = username });
            return count > 0;
        }

        public async Task<User?> CreateUserAsync(UserCreateRequest request)
        {
            // Hash the password using BCrypt
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);

            string sql = @"
                INSERT INTO userlist (username, password_hash, name, is_admin, created_on, is_deleted, failed_attempts, lockout_until)
                VALUES (@Username, @PasswordHash, @Name, @IsAdmin, now(), FALSE, 0, NULL)
                RETURNING id, username, name, created_on, is_admin, password_hash, failed_attempts, lockout_until, updated_on, is_deleted
            ";

            return await _db.QuerySingleAsync<User>(sql, new
            {
                Username = request.Username,
                PasswordHash = passwordHash,
                Name = request.Name,
                IsAdmin = request.IsAdmin
            });
        }
    }
}