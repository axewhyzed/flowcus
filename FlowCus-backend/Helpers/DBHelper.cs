using System;
using System.Data;
using System.Threading.Tasks;
using Npgsql;

namespace FlowCus.Helpers
{
    public class DbHelper
    {
        private readonly string _connectionString;
        //private NpgsqlConnection _connection;

        public DbHelper(IConfiguration configuration)
        {
            var encryptedConnStr = "";
            Console.WriteLine($"IsProd: {Environment.GetEnvironmentVariable("IsProd")}");
            if (Environment.GetEnvironmentVariable("IsProd") == "true"){
                encryptedConnStr = Environment.GetEnvironmentVariable("DBProd");
            } else
            {
                encryptedConnStr = configuration.GetConnectionString("DBLocal");
            }
            // Decrypt using environment variable key
            _connectionString = DecryptHelper.Decrypt(encryptedConnStr!);
            Console.WriteLine($"Decrypted string starts with: {_connectionString.Substring(0, 20)}");

            Console.WriteLine("Environment: " + Environment.GetEnvironmentVariable("IsProd"));
            Console.WriteLine("Encrypted Connection String: " + Environment.GetEnvironmentVariable("DBProd"));

            //_connection = new NpgsqlConnection(_connectionString);
        }

        private async Task<NpgsqlConnection> GetOpenConnectionAsync()
        {
            Console.WriteLine($"Using connection string: {_connectionString}");
            var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            return conn;
        }

        // Scalar: Returns a single value (e.g., COUNT(*))
        public async Task<object?> GetValue(string query, params NpgsqlParameter[]? parameters)
        {
            //using (var cmd = new NpgsqlCommand(query, await GetOpenConnectionAsync()))
            //{
            //    if (parameters != null)
            //        cmd.Parameters.AddRange(parameters);

            //    var result = await cmd.ExecuteScalarAsync();
            //    return result;
            //}
            using (var conn = await GetOpenConnectionAsync())
            using (var cmd = new NpgsqlCommand(query, conn))
            {
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                return await cmd.ExecuteScalarAsync();
            }
        }

        // Table: Returns a DataTable (multiple rows)
        public async Task<DataTable?> GetTable(string query, params NpgsqlParameter[]? parameters)
        {
            using (var conn = await GetOpenConnectionAsync())
            using (var cmd = new NpgsqlCommand(query, conn))
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
            using (var conn = await GetOpenConnectionAsync())
            using (var cmd = new NpgsqlCommand(query, conn))
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
                using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                return true;
            }
            catch (NpgsqlException ex)
            {
                Console.WriteLine($"Connection test failed: {ex.Message}");
                return false;
            }
        }


        //public void Dispose()
        //{
        //    if (_connection != null)
        //    {
        //        if (_connection.State != ConnectionState.Closed)
        //            _connection.Close();
        //        _connection.Dispose();
        //        _connection = null!;
        //    }
        //}
    }
}
