using FlowCus.Controllers;
using FlowCus.Models;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(int id);
        Task<int> UpdateNameAsync(int userId, string name);
        Task<bool> CheckUsernameExistsAsync(string username);
        Task<User?> CreateUserAsync(UserCreateRequest request);
    }
}
