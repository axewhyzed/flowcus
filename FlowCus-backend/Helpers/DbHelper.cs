using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;

namespace FlowCus.Helpers
{
    public class DbHelper : IDbHelper
    {
        private readonly string _connectionString;
        private readonly ILogger<DbHelper> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DbHelper(IConfiguration configuration, ILogger<DbHelper> logger, IHttpContextAccessor httpContextAccessor)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

            string? connectionString = configuration.GetConnectionString("DefaultConnection");
            string connectionName = "DefaultConnection";

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = configuration.GetConnectionString("DBLocal");
                connectionName = "DBLocal";
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                _logger.LogError("Connection string is null or empty.");
                throw new InvalidOperationException("Database connection string is missing. Set ConnectionStrings:DefaultConnection or ConnectionStrings:DBLocal.");
            }

            _connectionString = connectionString;
            _logger.LogInformation("Using database connection string: {ConnectionName}.", connectionName);
        }

        public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await conn.QueryAsync<T>(sql, param, tx);
            await tx.CommitAsync();
            return result;
        }

        public async Task<T?> QuerySingleAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await conn.QuerySingleOrDefaultAsync<T>(sql, param, tx);
            await tx.CommitAsync();
            return result;
        }

        public async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await conn.QuerySingleOrDefaultAsync<T>(sql, param, tx);
            await tx.CommitAsync();
            return result;
        }

        public async Task<int> ExecuteAsync(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await conn.ExecuteAsync(sql, param, tx);
            await tx.CommitAsync();
            return result;
        }

        public async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await conn.ExecuteScalarAsync<T>(sql, param, tx);
            await tx.CommitAsync();
            return result;
        }

        public async Task<T> ExecuteInTransactionAsync<T>(Func<IDbConnection, IDbTransaction, Task<T>> operation)
        {
            ArgumentNullException.ThrowIfNull(operation);
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();
            await SetUserContextAsync(conn, tx);
            var result = await operation(conn, tx);
            await tx.CommitAsync();
            return result;
        }

        private async Task SetUserContextAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
        {
            var claimValue = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            string userId = int.TryParse(claimValue, out var parsedUserId)
                ? parsedUserId.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : string.Empty;
            string isAdmin = _httpContextAccessor.HttpContext?.User.IsInRole("Admin") == true ? "true" : "false";
            await connection.ExecuteAsync(
                "SELECT set_config('app.user_id', @UserId, true), set_config('app.is_admin', @IsAdmin, true)",
                new { UserId = userId, IsAdmin = isAdmin },
                transaction);
        }
    }
}
