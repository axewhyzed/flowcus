using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Helpers
{
    public class DbHelper : IDbHelper
    {
        private readonly string _connectionString;
        private readonly ILogger<DbHelper> _logger;

        public DbHelper(IConfiguration configuration, ILogger<DbHelper> logger)
        {
            _logger = logger;
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
            return await conn.QueryAsync<T>(sql, param);
        }

        public async Task<T?> QuerySingleAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
        }

        public async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
        }

        public async Task<int> ExecuteAsync(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.ExecuteAsync(sql, param);
        }

        public async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.ExecuteScalarAsync<T>(sql, param);
        }
    }

    // Deprecated backwards-compatibility alias
    public class DBHelper : DbHelper
    {
        public DBHelper(IConfiguration configuration, ILogger<DbHelper> logger)
            : base(configuration, logger) { }
    }
}
