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

            string connectionString;
            bool isProd = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
            if (isProd)
            {
                string encryptedConnStr = Environment.GetEnvironmentVariable("DB_CONNECTION_ENCRYPTED")
                    ?? throw new InvalidOperationException("DB_CONNECTION_ENCRYPTED environment variable is not set in Production.");
                _logger.LogInformation("Production environment detected - decrypting connection string.");
                connectionString = CryptoHelper.Decrypt(encryptedConnStr, _logger);
            }
            else
            {
                string? localConnection = configuration.GetConnectionString("DBLocal");

                if (!string.IsNullOrWhiteSpace(localConnection))
                {
                    connectionString = localConnection;
                    _logger.LogInformation("Development environment detected - using DBLocal connection string as-is.");
                }
                else
                {
                    throw new InvalidOperationException("Neither DefaultConnection nor DBLocal is set in appsettings.json.");
                }
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                _logger.LogError("Connection string is null or empty.");
                throw new InvalidOperationException("Connection string cannot be null or empty.");
            }

            _connectionString = connectionString;
            _logger.LogDebug("Database connection string decrypted successfully.");
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
