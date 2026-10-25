using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services
{
    public class UserService : IUserService
    {
        private readonly IDbHelper _db;
        private readonly int _bcryptWorkFactor;

        public UserService(IDbHelper db, IConfiguration configuration)
        {
            _db = db;
            _bcryptWorkFactor = int.TryParse(configuration["AuthSettings:BcryptWorkFactor"], out var factor) && factor is >= 4 and <= 16
                ? factor
                : 12;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            string sql = "SELECT * FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1";
            return await _db.QuerySingleAsync<User>(sql, new { Id = id });
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            string sql = "SELECT * FROM userlist WHERE is_deleted = FALSE ORDER BY created_on DESC";
            return await _db.QueryAsync<User>(sql);
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
            if (string.IsNullOrWhiteSpace(request.Username))
                throw new ArgumentException("Username is required.", nameof(request));
            if (!PasswordPolicy.IsValid(request.Password))
                throw new ArgumentException($"Password must be at least {PasswordPolicy.MinimumLength} characters long.", nameof(request));

            string username = request.Username.Trim();
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);

            string sql = @"
                INSERT INTO userlist (username, password_hash, name, is_admin, created_on, is_deleted, failed_attempts, lockout_until)
                VALUES (@Username, @PasswordHash, @Name, @IsAdmin, now(), FALSE, 0, NULL)
                RETURNING id, username, name, created_on, is_admin, password_hash, failed_attempts, lockout_until, updated_on, is_deleted
            ";

            return await _db.QuerySingleAsync<User>(sql, new
            {
                Username = username,
                PasswordHash = passwordHash,
                Name = request.Name,
                IsAdmin = request.IsAdmin
            });
        }

        public async Task<AdminUpdateUserResult> UpdateUserAdminAsync(int id, UpdateUserRequest request)
        {
            var updates = new List<string>();
            var parameters = new Dictionary<string, object> { { "Id", id } };

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                updates.Add("name = @Name");
                parameters["Name"] = request.Name;
            }

            if (request.IsAdmin.HasValue)
            {
                updates.Add("is_admin = @IsAdmin");
                parameters["IsAdmin"] = request.IsAdmin.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                updates.Add("password_hash = @PasswordHash");
                parameters["PasswordHash"] = BCrypt.Net.BCrypt.HashPassword(request.Password, _bcryptWorkFactor);
            }

            bool revokeTokens = request.IsAdmin.HasValue || !string.IsNullOrWhiteSpace(request.Password);
            if (revokeTokens)
            {
                updates.Add("token_version = token_version + 1");
            }

            if (updates.Count == 0)
            {
                return new AdminUpdateUserResult { Status = AdminUpdateStatus.NoFields, ErrorMessage = "No fields to update." };
            }

            // If demoting from admin, verify not the last active admin
            if (request.IsAdmin.HasValue && !request.IsAdmin.Value)
            {
                bool targetIsAdmin = await _db.ExecuteScalarAsync<bool>(
                    "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE",
                    new { Id = id });

                if (targetIsAdmin)
                {
                    long otherAdminCount = await _db.ExecuteScalarAsync<long>(
                        "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                        new { Id = id });

                    if (otherAdminCount == 0)
                    {
                        return new AdminUpdateUserResult
                        {
                            Status = AdminUpdateStatus.CannotDemoteLastAdmin,
                            ErrorMessage = "Cannot remove admin rights from the last admin account."
                        };
                    }
                }
            }

            updates.Add("updated_on = now()");
            string sql = $"UPDATE userlist SET {string.Join(", ", updates)} WHERE id = @Id AND is_deleted = FALSE";

            int rows = await _db.ExecuteAsync(sql, parameters);
            if (rows == 0)
            {
                return new AdminUpdateUserResult { Status = AdminUpdateStatus.NotFound, ErrorMessage = "User not found" };
            }

            var updatedUser = await GetByIdAsync(id);
            return new AdminUpdateUserResult
            {
                Success = true,
                Status = AdminUpdateStatus.Success,
                User = updatedUser
            };
        }

        public async Task<AdminDeleteStatus> DeleteUserAdminAsync(int id, int currentUserId)
        {
            if (id == currentUserId)
            {
                return AdminDeleteStatus.SelfDelete;
            }

            bool targetIsAdmin = await _db.ExecuteScalarAsync<bool>(
                "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE",
                new { Id = id });

            if (targetIsAdmin)
            {
                long otherAdminCount = await _db.ExecuteScalarAsync<long>(
                    "SELECT COUNT(*) FROM userlist WHERE is_admin = TRUE AND is_deleted = FALSE AND id != @Id",
                    new { Id = id });

                if (otherAdminCount == 0)
                {
                    return AdminDeleteStatus.LastAdmin;
                }
            }

            string sql = "UPDATE userlist SET is_deleted = TRUE, updated_on = now() WHERE id = @Id AND is_deleted = FALSE";
            int rows = await _db.ExecuteAsync(sql, new { Id = id });

            return rows > 0 ? AdminDeleteStatus.Success : AdminDeleteStatus.NotFound;
        }

        public async Task<ChangePasswordResult> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
        {
            string? storedHash = await _db.QuerySingleAsync<string>(
                "SELECT password_hash FROM userlist WHERE id = @Id AND is_deleted = FALSE",
                new { Id = userId });

            if (string.IsNullOrEmpty(storedHash))
            {
                return ChangePasswordResult.UserNotFound;
            }

            if (!BCrypt.Net.BCrypt.Verify(currentPassword, storedHash))
            {
                return ChangePasswordResult.InvalidCurrentPassword;
            }

            string newHash = BCrypt.Net.BCrypt.HashPassword(newPassword, _bcryptWorkFactor);

            int updated = await _db.ExecuteAsync(@"
                UPDATE userlist
                SET password_hash = @Hash, token_version = token_version + 1, updated_on = now()
                WHERE id = @Id AND is_deleted = FALSE AND password_hash = @CurrentHash",
                new { Hash = newHash, CurrentHash = storedHash, Id = userId });

            return updated > 0 ? ChangePasswordResult.Success : ChangePasswordResult.ConcurrencyConflict;
        }

        public async Task<bool> RevokeUserTokensAsync(int userId)
        {
            int updated = await _db.ExecuteAsync(@"
                UPDATE userlist
                SET token_version = token_version + 1, updated_on = now()
                WHERE id = @Id AND is_deleted = FALSE",
                new { Id = userId });
            return updated > 0;
        }
    }
}
