using FlowCus.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface ITaskSubtypeService
    {
        Task<int> CreateAsync(TaskSubtype subtype);
        Task<TaskSubtype?> GetByIdAsync(int id, int userId);
        Task<IEnumerable<TaskSubtype>> GetAllAsync(int userId);
        Task<bool> UpdateAsync(TaskSubtype subtype);
        Task<bool> DeleteAsync(int id, int userId);
    }
}
