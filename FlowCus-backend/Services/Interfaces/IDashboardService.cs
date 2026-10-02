using FlowCus.Models;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<object> GetDashboardStatsAsync(int userId, int? timezoneOffsetMinutes = null);
        Task<TimetableItem?> GetActiveFocusAsync(int userId, int? timezoneOffsetMinutes = null);
    }
}
