using FlowCus.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface ITaskCategoryService
    {
        Task<IEnumerable<TaskCategory>> GetAllAsync();
        Task<int> CreateAsync(TaskCategory category);
        Task<bool> DeleteAsync(int id);
        Task<TaskCategory?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(TaskCategory category);
    }
}
