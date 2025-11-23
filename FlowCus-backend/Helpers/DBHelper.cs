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

            string encryptedConnStr;
            bool isProd = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
            if (isProd)
            {
                encryptedConnStr = Environment.GetEnvironmentVariable("DBProd")
                    ?? throw new InvalidOperationException("DBProd environment variable is not set.");
                _logger.LogInformation("Production environment detected.");
            }
            else
            {
                encryptedConnStr = configuration.GetConnectionString("DBLocal")
                    ?? throw new InvalidOperationException("DBLocal connection string is not set.");
                _logger.LogInformation("Development environment detected.");
            }

            if (string.IsNullOrWhiteSpace(encryptedConnStr))
            {
                _logger.LogError("Connection string is null or empty.");
                throw new InvalidOperationException("Connection string cannot be null or empty.");
            }

            _connectionString = CryptoHelper.Decrypt(encryptedConnStr, _logger);
            _logger.LogDebug("Connection string decrypted successfully.");
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

        // REMOVED: GetTableAsync, GetValueAsync, ExecuteQueryAsync
    }
}