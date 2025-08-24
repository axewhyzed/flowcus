using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace FlowCus.Helpers
{
    /// <summary>
    /// Provides helper methods for executing database operations against PostgreSQL.
    /// </summary>
    public class DBHelper
    {
        private readonly string _connectionString;
        private readonly ILogger<DBHelper> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DBHelper"/> class.
        /// </summary>
        /// <param name="configuration">Application configuration settings.</param>
        /// <param name="logger">Logger instance for capturing operational events.</param>
        /// <exception cref="InvalidOperationException">
        /// Thrown when connection string configuration is missing or invalid.
        /// </exception>
        public DBHelper(IConfiguration configuration, ILogger<DBHelper> logger)
        {
            _logger = logger;

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

        private async Task<NpgsqlConnection> GetOpenConnectionAsync()
        {
            var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            _logger.LogDebug("Database connection opened.");
            return conn;
        }

        /// <summary>
        /// Executes a SQL query and returns the value received.
        /// </summary>
        public async Task<object?> GetValueAsync(string query, params NpgsqlParameter[] parameters)
        {
            try
            {
                using var conn = await GetOpenConnectionAsync();
                using var cmd = new NpgsqlCommand(query, conn);
                if (parameters.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                var result = await cmd.ExecuteScalarAsync();
                _logger.LogDebug("Executed scalar query: {Query}", query);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing scalar query: {Query}", query);
                throw;
            }
        }

        /// <summary>
        /// Executes a SQL query and returns a DataTable.
        /// </summary>
        public async Task<DataTable> GetTableAsync(string query, params NpgsqlParameter[] parameters)
        {
            try
            {
                using var conn = await GetOpenConnectionAsync();
                using var cmd = new NpgsqlCommand(query, conn);
                if (parameters.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                using var adapter = new NpgsqlDataAdapter(cmd);
                var dt = new DataTable();
                adapter.Fill(dt);
                _logger.LogDebug("Executed table query: {Query}", query);
                return dt;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing table query: {Query}", query);
                throw;
            }
        }

        /// <summary>
        /// Executes a SQL query and returns a Dataset.
        /// </summary>
        public async Task<DataSet> GetDataSetAsync(string query, params NpgsqlParameter[] parameters)
        {
            try
            {
                using var conn = await GetOpenConnectionAsync();
                using var cmd = new NpgsqlCommand(query, conn);
                if (parameters.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                using var adapter = new NpgsqlDataAdapter(cmd);
                var ds = new DataSet();
                adapter.Fill(ds);
                _logger.LogDebug("Executed dataset query: {Query}", query);
                return ds;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing dataset query: {Query}", query);
                throw;
            }
        }

        /// <summary>
        /// Executes a SQL command and returns the number of affected rows.
        /// </summary>
        public async Task<int> ExecuteQueryAsync(string query, params NpgsqlParameter[] parameters)
        {
            try
            {
                using var conn = await GetOpenConnectionAsync();
                using var cmd = new NpgsqlCommand(query, conn);
                if (parameters.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                int affectedRows = await cmd.ExecuteNonQueryAsync();
                _logger.LogDebug("Executed non-query: {Query}, affected rows: {Rows}", query, affectedRows);
                return affectedRows;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing non-query: {Query}", query);
                throw;
            }
        }

        public async Task ExecuteTransactionalQueriesAsync(
    List<(string Query, NpgsqlParameter[] Parameters)> operations)
        {
            await using var conn = await GetOpenConnectionAsync();
            await using var transaction = await conn.BeginTransactionAsync();

            try
            {
                foreach (var (query, parameters) in operations)
                {
                    await using var cmd = new NpgsqlCommand(query, conn, transaction);
                    if (parameters.Length > 0)
                        cmd.Parameters.AddRange(parameters);

                    await cmd.ExecuteNonQueryAsync();
                }
                await transaction.CommitAsync();
                _logger.LogDebug("Transaction committed successfully.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Transaction rolled back due to error");
                throw;
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                _logger.LogInformation("Database connection test succeeded.");
                return true;
            }
            catch (NpgsqlException ex)
            {
                _logger.LogError(ex, "Database connection test failed.");
                return false;
            }
        }
    }
}
