using FlowCus.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface ITimetableService
    {
        Task<IEnumerable<Timetable>> GetAllAsync(int userId);
        Task<int> CreateAsync(Timetable timetable);
        Task<bool> ActivateTimetableAsync(int timetableId, int userId);
        Task<Timetable?> GetByIdAsync(int id, int userId);
        Task<IEnumerable<TimetableItem>> GetItemsAsync(int timetableId, int userId);
        Task<int> CreateItemAsync(TimetableItem item, int userId);
        Task<bool> UpdateItemAsync(int id, TimetableItem item, int userId);
        Task<bool> UpdateAsync(int id, string name, int userId);
        Task<bool> DeactivateTimetableAsync(int timetableId, int userId);
        Task<bool> DeleteAsync(int id, int userId);
        Task<bool> DeleteItemAsync(int id, int userId);
        Task<object> ApplyTemplateAsync(string templateName, int userId);
        Task<int> ShiftTodayAsync(int minutes, int userId, int? dayOfWeek = null);
    }
}
