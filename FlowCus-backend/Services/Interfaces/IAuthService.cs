using FlowCus.Services;
using System.Threading.Tasks;

namespace FlowCus.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResult> AuthenticateAsync(string username, string password);
    }
}
