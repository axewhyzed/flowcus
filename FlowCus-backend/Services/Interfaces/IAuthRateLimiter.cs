using System.Net;

namespace FlowCus.Services.Interfaces
{
    public interface IAuthRateLimiter
    {
        Task<AuthRateLimitDecision> CheckAsync(
            string username,
            IPAddress? remoteAddress,
            CancellationToken cancellationToken = default);
    }

    public sealed record AuthRateLimitDecision(bool Allowed, int RetryAfterSeconds);
}
