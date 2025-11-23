using Dapper;
using FlowCus.Controllers;
using FlowCus.Helpers;
using FlowCus.Models;
using Npgsql;
using System;
using System.Data;
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
            return await _db.ExecuteQueryAsync(sql, new NpgsqlParameter("@Name", name), new NpgsqlParameter("@UserId", userId));
        }

        public async Task<bool> CheckUsernameExistsAsync(string username)
        {
            string sql = "SELECT COUNT(*) FROM userlist WHERE username = @Username";
            // FIX: PostgreSQL COUNT returns BigInt (Int64), not Int32.
            long count = await _db.ExecuteScalarAsync<long>(sql, new NpgsqlParameter("@Username", username));
            return count > 0;
        }

        public async Task<User?> CreateUserAsync(UserCreateRequest request)
        {
            string sql = @"
                INSERT INTO userlist (username, name, is_admin, created_on)
                VALUES (@Username, @Name, @IsAdmin, now())
                RETURNING id, username, name, created_on, is_admin
            ";

            var dt = await _db.GetTableAsync(sql,
                new NpgsqlParameter("@Username", request.Username),
                new NpgsqlParameter("@Name", (object?)request.Name ?? DBNull.Value),
                new NpgsqlParameter("@IsAdmin", request.IsAdmin)
            );

            if (dt.Rows.Count == 1)
            {
                var row = dt.Rows[0];
                return new User
                {
                    Id = Convert.ToInt32(row["id"]),
                    Username = row["username"].ToString(),
                    Name = row["name"] == DBNull.Value ? null : row["name"].ToString(),
                    CreatedOn = (DateTime)row["created_on"],
                    IsAdmin = row["is_admin"] != DBNull.Value && Convert.ToBoolean(row["is_admin"])
                };
            }

            return null;
        }
    }
}