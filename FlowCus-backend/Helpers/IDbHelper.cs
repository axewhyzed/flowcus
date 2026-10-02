using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Helpers
{
    public interface IDbHelper
    {
        Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null);
        Task<T?> QuerySingleAsync<T>(string sql, object? param = null);
        Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null);
        Task<int> ExecuteAsync(string sql, object? param = null);
        Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null);
    }
}
