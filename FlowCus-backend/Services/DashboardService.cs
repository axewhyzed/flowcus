using FlowCus.Helpers;
using Dapper;

namespace FlowCus.Services
{
    public class DashboardService
    {
        private readonly DBHelper _db;

        public DashboardService(DBHelper db)
        {
            _db = db;
        }

        public async Task<object> GetDashboardStatsAsync(int userId)
        {
            // Run multiple queries in parallel or sequentially
            string sqlTasks = "SELECT COUNT(*) FROM tasks WHERE created_by = @CreatedBy AND is_deleted = FALSE";
            string sqlCats = "SELECT COUNT(*) FROM task_category WHERE is_deleted = FALSE";

            var pending = await _db.ExecuteScalarAsync<int>(sqlTasks, new { CreatedBy = userId });
            var categories = await _db.ExecuteScalarAsync<int>(sqlCats, new { CreatedBy = userId });

            return new
            {
                PendingTasks = pending,
                TotalCategories = categories
            };
        }
    }
}