using FlowCus.Helpers;
using FlowCus.Models;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardStatsResponse> GetDashboardStatsAsync(int userId, ClientTimeZone timeZone);
        Task<TimetableItem?> GetActiveFocusAsync(int userId, ClientTimeZone timeZone);
    }
}
