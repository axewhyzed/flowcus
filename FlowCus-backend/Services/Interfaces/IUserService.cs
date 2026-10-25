using FlowCus.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(int id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<int> UpdateNameAsync(int userId, string name);
        Task<bool> CheckUsernameExistsAsync(string username);
        Task<User?> CreateUserAsync(UserCreateRequest request);
        Task<AdminUpdateUserResult> UpdateUserAdminAsync(int id, UpdateUserRequest request);
        Task<AdminDeleteStatus> DeleteUserAdminAsync(int id, int currentUserId);
        Task<ChangePasswordResult> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
        Task<bool> RevokeUserTokensAsync(int userId);
    }

    public class AdminUpdateUserResult
    {
        public bool Success { get; set; }
        public User? User { get; set; }
        public string? ErrorMessage { get; set; }
        public AdminUpdateStatus Status { get; set; }
    }

    public enum AdminUpdateStatus
    {
        Success,
        NotFound,
        CannotDemoteLastAdmin,
        NoFields
    }

    public enum AdminDeleteStatus
    {
        Success,
        SelfDelete,
        LastAdmin,
        NotFound
    }

    public enum ChangePasswordResult
    {
        Success,
        UserNotFound,
        InvalidCurrentPassword,
        ConcurrencyConflict
    }
}
