using System;
using System.Data;
using System.Threading.Tasks;
using Npgsql;

namespace FlowCus.Helpers
{
    public class DbHelper : IDisposable
    {
        private readonly string _connectionString;
        private NpgsqlConnection _connection;

        public DbHelper(IConfiguration configuration)
        {
            var encryptedConnStr = configuration.GetConnectionString("DefaultConnection");
            // Decrypt using environment variable key
            _connectionString = DecryptHelper.Decrypt(encryptedConnStr!);

            _connection = new NpgsqlConnection(_connectionString);
        }

        private async Task<NpgsqlConnection> GetOpenConnectionAsync()
        {
            if (_connection.State != ConnectionState.Open)
                await _connection.OpenAsync();
            return _connection;
        }

        // Scalar: Returns a single value (e.g., COUNT(*))
        public async Task<object?> GetValue(string query, params NpgsqlParameter[]? parameters)
        {
            using (var cmd = new NpgsqlCommand(query, await GetOpenConnectionAsync()))
            {
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                var result = await cmd.ExecuteScalarAsync();
                return result;
            }
        }

        // Table: Returns a DataTable (multiple rows)
        public async Task<DataTable?> GetTable(string query, params NpgsqlParameter[]? parameters)
        {
            using (var cmd = new NpgsqlCommand(query, await GetOpenConnectionAsync()))
            {
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                using (var adapter = new NpgsqlDataAdapter(cmd))
                {
                    var dt = new DataTable();
                    adapter.Fill(dt);
                    return dt;
                }
            }
        }

        // DataSet: Returns a DataSet (multiple tables)
        public async Task<DataSet?> GetDataSet(string query, params NpgsqlParameter[]? parameters)
        {
            using (var cmd = new NpgsqlCommand(query, await GetOpenConnectionAsync()))
            {
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                using (var adapter = new NpgsqlDataAdapter(cmd))
                {
                    var ds = new DataSet();
                    adapter.Fill(ds);
                    return ds;
                }
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                // Explicitly open and close the connection
                await _connection.OpenAsync();
                await _connection.CloseAsync();
                return true;
            }
            catch (NpgsqlException ex)
            {
                // Log exception if needed
                Console.WriteLine($"Connection test failed: {ex.Message}");
                return false;
            }
            finally
            {
                // Ensure connection is closed if still open
                if (_connection.State == ConnectionState.Open)
                    await _connection.CloseAsync();
            }
        }


        public void Dispose()
        {
            if (_connection != null)
            {
                if (_connection.State != ConnectionState.Closed)
                    _connection.Close();
                _connection.Dispose();
                _connection = null!;
            }
        }
    }
}
