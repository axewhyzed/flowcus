using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Data;
using System.Threading.Tasks;
using Dapper; // NEW: Dapper namespace

namespace FlowCus.Helpers
{
    public class DBHelper
    {
        private readonly string _connectionString;

        public DBHelper(IConfiguration configuration)
        {
            // Ensure we support snake_case mapping for Dapper globally
            Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        // --- NEW: Dapper Methods ---

        // Get a list of items (SELECT *)
        public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.QueryAsync<T>(sql, param);
        }

        // Get a single item (SELECT ... LIMIT 1)
        public async Task<T?> QuerySingleAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.QueryFirstOrDefaultAsync<T>(sql, param);
        }

        // Execute a command (INSERT, UPDATE, DELETE)
        public async Task<int> ExecuteAsync(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.ExecuteAsync(sql, param);
        }

        // Execute and get a value (e.g. returning ID)
        public async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            return await conn.ExecuteScalarAsync<T>(sql, param);
        }

        // --- OLD: Legacy Methods (Kept for backward compatibility) ---

        public async Task<DataTable> GetTableAsync(string query, params NpgsqlParameter[] parameters)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            using var cmd = new NpgsqlCommand(query, conn);
            if (parameters != null) cmd.Parameters.AddRange(parameters);

            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            var dt = new DataTable();
            dt.Load(reader);
            return dt;
        }

        public async Task<object?> GetValueAsync(string query, params NpgsqlParameter[] parameters)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            using var cmd = new NpgsqlCommand(query, conn);
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            await conn.OpenAsync();
            return await cmd.ExecuteScalarAsync();
        }

        public async Task<int> ExecuteQueryAsync(string query, params NpgsqlParameter[] parameters)
        {
            using var conn = new NpgsqlConnection(_connectionString);
            using var cmd = new NpgsqlCommand(query, conn);
            if (parameters != null) cmd.Parameters.AddRange(parameters);
            await conn.OpenAsync();
            return await cmd.ExecuteNonQueryAsync();
        }
    }
}