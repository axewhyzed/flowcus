using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Data;
using System.Threading.Tasks;
using Dapper;

namespace FlowCus.Helpers
{
    public class DBHelper
    {
        private readonly string _connectionString;
        private readonly ILogger<DBHelper> _logger;

        public DBHelper(IConfiguration configuration, ILogger<DBHelper> logger)
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

        // --- Dapper Methods ---

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

        public async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
        }

        // REMOVED: GetTableAsync, GetValueAsync, ExecuteQueryAsync
    }
}
