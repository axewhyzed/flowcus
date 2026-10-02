using FlowCus.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface ITaskService
    {
        Task<IEnumerable<TaskEntity>> GetAllAsync(int userId);
        Task<int> CreateAsync(TaskEntity task);
        Task<bool> UpdateAsync(TaskEntity task);
        Task<bool> ToggleCompleteAsync(int id, int userId, bool? isCompleted = null);
        Task<bool> DeleteAsync(int id, int userId);
        Task<TaskEntity?> GetByIdAsync(int id, int userId);
        Task<int> RolloverYesterdayTasksAsync(int userId);
    }
}
