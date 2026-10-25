using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using FlowCus.Helpers;
using FlowCus.Services.Interfaces;

namespace FlowCus.Services
{
    public sealed class AuthRateLimiter : IAuthRateLimiter
    {
        private static readonly TimeSpan Window = TimeSpan.FromSeconds(60);
        private readonly int _ipLimit;
        private readonly int _usernameLimit;
        private readonly ConcurrentDictionary<string, ConcurrentQueue<DateTimeOffset>> _attempts = new(StringComparer.Ordinal);

        public AuthRateLimiter(IConfiguration configuration)
        {
            _ipLimit = ReadLimit(configuration, "AuthSettings:IpRateLimitPerMinute", 30);
            _usernameLimit = ReadLimit(configuration, "AuthSettings:UserRateLimitPerMinute", 10);
        }

        public AuthRateLimiter(IDbHelper db, IConfiguration configuration) : this(configuration)
        {
        }

        public Task<AuthRateLimitDecision> CheckAsync(
            string username,
            IPAddress? remoteAddress,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            string ipKey = AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(remoteAddress));
            string usernameKey = AuthRateLimitIdentity.CreateKey("user", AuthRateLimitIdentity.NormalizeUsername(username));

            var now = DateTimeOffset.UtcNow;
            var cutoff = now - Window;

            var ipQueue = _attempts.GetOrAdd(ipKey, _ => new ConcurrentQueue<DateTimeOffset>());
            CleanQueue(ipQueue, cutoff);

            var userQueue = _attempts.GetOrAdd(usernameKey, _ => new ConcurrentQueue<DateTimeOffset>());
            CleanQueue(userQueue, cutoff);

            int ipCount = ipQueue.Count;
            int userCount = userQueue.Count;

            if (ipCount >= _ipLimit || userCount >= _usernameLimit)
            {
                int retrySeconds = 60;
                if (userCount >= _usernameLimit && userQueue.TryPeek(out var oldestUser))
                {
                    retrySeconds = Math.Clamp((int)Math.Ceiling((oldestUser + Window - now).TotalSeconds), 1, 60);
                }
                else if (ipCount >= _ipLimit && ipQueue.TryPeek(out var oldestIp))
                {
                    retrySeconds = Math.Clamp((int)Math.Ceiling((oldestIp + Window - now).TotalSeconds), 1, 60);
                }
                return Task.FromResult(new AuthRateLimitDecision(false, retrySeconds));
            }

            ipQueue.Enqueue(now);
            userQueue.Enqueue(now);

            return Task.FromResult(new AuthRateLimitDecision(true, 0));
        }

        private static void CleanQueue(ConcurrentQueue<DateTimeOffset> queue, DateTimeOffset cutoff)
        {
            while (queue.TryPeek(out var timestamp) && timestamp <= cutoff)
            {
                queue.TryDequeue(out _);
            }
        }

        private static int ReadLimit(IConfiguration configuration, string key, int fallback)
        {
            int value = configuration.GetValue<int?>(key) ?? fallback;
            if (value < 1)
                throw new InvalidOperationException($"Configuration {key} must be greater than zero.");
            return value;
        }
    }

    public static class AuthRateLimitIdentity
    {
        public static string NormalizeIp(IPAddress? address)
        {
            if (address == null) return "unknown";
            if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
            return address.ToString();
        }

        public static string NormalizeUsername(string username) =>
            (username ?? string.Empty).Trim().Normalize(NormalizationForm.FormKC).ToUpperInvariant();

        public static string CreateKey(string kind, string normalizedValue)
        {
            byte[] digest = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedValue));
            return $"{kind}:{Convert.ToHexString(digest)}";
        }
    }
}
