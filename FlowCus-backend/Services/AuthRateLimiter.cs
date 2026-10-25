using System.Net;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using FlowCus.Helpers;
using FlowCus.Services.Interfaces;

namespace FlowCus.Services
{
    public sealed class AuthRateLimiter : IAuthRateLimiter
    {
        private static readonly TimeSpan Window = TimeSpan.FromSeconds(60);
        private readonly IDbHelper _db;
        private readonly int _ipLimit;
        private readonly int _usernameLimit;

        public AuthRateLimiter(IDbHelper db, IConfiguration configuration)
        {
            _db = db;
            _ipLimit = ReadLimit(configuration, "AuthSettings:IpRateLimitPerMinute", 30);
            _usernameLimit = ReadLimit(configuration, "AuthSettings:UserRateLimitPerMinute", 10);
        }

        public Task<AuthRateLimitDecision> CheckAsync(
            string username,
            IPAddress? remoteAddress,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            string ipKey = AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(remoteAddress));
            string usernameKey = AuthRateLimitIdentity.CreateKey("user", AuthRateLimitIdentity.NormalizeUsername(username));
            string[] keys = [ipKey, usernameKey];
            Array.Sort(keys, StringComparer.Ordinal);

            return _db.ExecuteInTransactionAsync(async (connection, transaction) =>
            {
                // Hash-based transaction locks work across API processes and avoid retaining
                // lock rows for attacker-controlled usernames. Acquire in a stable order.
                foreach (string key in keys)
                {
                    await connection.ExecuteAsync(
                        "SELECT pg_advisory_xact_lock(hashtextextended(@Key, 0))",
                        new { Key = key },
                        transaction);
                }

                await connection.ExecuteAsync(@"
                    WITH stale AS (
                        SELECT ctid
                        FROM auth_rate_limit_events
                        WHERE occurred_on < clock_timestamp() - INTERVAL '2 minutes'
                        ORDER BY occurred_on
                        LIMIT 500
                    )
                    DELETE FROM auth_rate_limit_events events
                    USING stale
                    WHERE events.ctid = stale.ctid;", transaction: transaction);

                var activeEvents = (await connection.QueryAsync<RateLimitEvent>(@"
                    SELECT identity_key AS IdentityKey, occurred_on AS OccurredOn
                    FROM auth_rate_limit_events
                    WHERE identity_key = ANY(@Keys)
                      AND occurred_on > clock_timestamp() - INTERVAL '60 seconds'
                    ORDER BY identity_key, occurred_on;",
                    new { Keys = keys }, transaction)).ToLookup(e => e.IdentityKey, StringComparer.Ordinal);

                int ipCount = activeEvents[ipKey].Count();
                int usernameCount = activeEvents[usernameKey].Count();
                bool allowed = ipCount < _ipLimit && usernameCount < _usernameLimit;

                if (!allowed)
                {
                    var databaseNow = await connection.ExecuteScalarAsync<DateTime>(
                        "SELECT clock_timestamp()",
                        transaction: transaction);
                    DateTimeOffset retryAt = DateTimeOffset.MinValue;

                    UpdateRetryTime(ipKey, _ipLimit, ipCount);
                    UpdateRetryTime(usernameKey, _usernameLimit, usernameCount);

                    int retrySeconds = Math.Max(1, (int)Math.Ceiling((retryAt.UtcDateTime - databaseNow).TotalSeconds));
                    return new AuthRateLimitDecision(false, retrySeconds);

                    void UpdateRetryTime(string key, int limit, int count)
                    {
                        if (count < limit) return;
                        var events = activeEvents[key].ToArray();
                        int expirationIndex = Math.Clamp(count - limit, 0, events.Length - 1);
                        DateTime occurredOn = DateTime.SpecifyKind(events[expirationIndex].OccurredOn, DateTimeKind.Utc);
                        DateTimeOffset expiresAt = new(occurredOn.Add(Window));
                        if (expiresAt > retryAt) retryAt = expiresAt;
                    }
                }

                await connection.ExecuteAsync(@"
                    INSERT INTO auth_rate_limit_events (identity_key, occurred_on)
                    SELECT identity_key, clock_timestamp()
                    FROM unnest(@Keys::varchar[]) AS keys(identity_key);",
                    new { Keys = keys }, transaction);

                return new AuthRateLimitDecision(true, 0);
            });
        }

        private static int ReadLimit(IConfiguration configuration, string key, int fallback)
        {
            int value = configuration.GetValue<int?>(key) ?? fallback;
            if (value < 1)
                throw new InvalidOperationException($"Configuration {key} must be greater than zero.");
            return value;
        }

        private sealed class RateLimitEvent
        {
            public string IdentityKey { get; set; } = string.Empty;
            public DateTime OccurredOn { get; set; }
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
