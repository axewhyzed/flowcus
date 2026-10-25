using System.Net;
using FlowCus.Helpers;
using FlowCus.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Xunit.Abstractions;

namespace FlowCus.Tests
{
    /// <summary>
    /// Opt-in integration checks against a disposable database with the sliding-window
    /// migration applied. Set FLOWCUS_TEST_DATABASE to execute; otherwise each test reports not-run.
    /// </summary>
    public class AuthRateLimiterPostgresIntegrationTests
    {
        private readonly ITestOutputHelper _output;

        public AuthRateLimiterPostgresIntegrationTests(ITestOutputHelper output) => _output = output;

        [Fact]
        public async Task ConcurrentAdmissionsNeverExceedTheConfiguredWindowLimit()
        {
            if (!TryGetTestConnectionString(out string connectionString)) return;
            await EnsureMigratedAsync(connectionString);

            string username = $"integration-{Guid.NewGuid():N}";
            IPAddress ip = IPAddress.Parse("198.51.100.7");
            string[] keys = GetKeys(username, ip);
            try
            {
                var limiters = new[]
                {
                    CreateLimiter(connectionString, ipLimit: 50, usernameLimit: 3),
                    CreateLimiter(connectionString, ipLimit: 50, usernameLimit: 3)
                };
                var requests = Enumerable.Range(0, 24)
                    .Select(index => limiters[index % limiters.Length].CheckAsync(username, ip))
                    .ToArray();

                var decisions = await Task.WhenAll(requests);

                Assert.Equal(3, decisions.Count(d => d.Allowed));
                Assert.All(decisions.Where(d => !d.Allowed), d => Assert.InRange(d.RetryAfterSeconds, 1, 60));
            }
            finally
            {
                await ClearEventsAsync(connectionString, keys);
            }
        }

        [Fact]
        public async Task ExpiredAdmissionsRestoreCapacity()
        {
            if (!TryGetTestConnectionString(out string connectionString)) return;
            await EnsureMigratedAsync(connectionString);

            string username = $"integration-{Guid.NewGuid():N}";
            IPAddress ip = IPAddress.Parse("198.51.100.9");
            string[] keys = GetKeys(username, ip);
            try
            {
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = @"
                    INSERT INTO auth_rate_limit_events (identity_key, occurred_on)
                    SELECT identity_key, clock_timestamp() - INTERVAL '61 seconds'
                    FROM unnest(@keys::varchar[]) AS keys(identity_key);";
                command.Parameters.AddWithValue("keys", keys);
                await command.ExecuteNonQueryAsync();

                var limiter = CreateLimiter(connectionString, ipLimit: 1, usernameLimit: 1);
                var decision = await limiter.CheckAsync(username, ip);

                Assert.True(decision.Allowed);
            }
            finally
            {
                await ClearEventsAsync(connectionString, keys);
            }
        }

        [Fact]
        public async Task EventsUseRollingSixtySecondAgeInsteadOfMinuteBuckets()
        {
            if (!TryGetTestConnectionString(out string connectionString)) return;
            await EnsureMigratedAsync(connectionString);

            string username = $"integration-{Guid.NewGuid():N}";
            IPAddress ip = IPAddress.Parse("198.51.100.8");
            string userKey = AuthRateLimitIdentity.CreateKey("user", AuthRateLimitIdentity.NormalizeUsername(username));
            string ipKey = AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(ip));
            try
            {
                await using (var connection = new NpgsqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    await using var command = connection.CreateCommand();
                    command.CommandText = @"
                        INSERT INTO auth_rate_limit_events (identity_key, occurred_on)
                        VALUES (@user_key, clock_timestamp() - INTERVAL '45 seconds'),
                               (@ip_key, clock_timestamp() - INTERVAL '45 seconds');";
                    command.Parameters.AddWithValue("user_key", userKey);
                    command.Parameters.AddWithValue("ip_key", ipKey);
                    await command.ExecuteNonQueryAsync();
                }

                var limiter = CreateLimiter(connectionString, ipLimit: 10, usernameLimit: 2);
                var decisions = await Task.WhenAll(Enumerable.Range(0, 8)
                    .Select(_ => limiter.CheckAsync(username, ip)));

                Assert.Equal(1, decisions.Count(d => d.Allowed));
                Assert.All(decisions.Where(d => !d.Allowed), d => Assert.InRange(d.RetryAfterSeconds, 1, 20));
            }
            finally
            {
                await ClearEventsAsync(connectionString, [userKey, ipKey]);
            }
        }

        private bool TryGetTestConnectionString(out string connectionString)
        {
            connectionString = Environment.GetEnvironmentVariable("FLOWCUS_TEST_DATABASE") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                _output.WriteLine("Not run: set FLOWCUS_TEST_DATABASE to a disposable PostgreSQL database after applying the sliding-rate-limit migration.");
                return false;
            }
            return true;
        }

        private static async Task EnsureMigratedAsync(string connectionString)
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT to_regclass('public.auth_rate_limit_events') IS NOT NULL";
            if (!Convert.ToBoolean(await command.ExecuteScalarAsync()))
                throw new InvalidOperationException("The test database is missing auth_rate_limit_events; apply the sliding-rate-limit migration first.");
        }

        private static AuthRateLimiter CreateLimiter(string connectionString, int ipLimit, int usernameLimit)
        {
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["AuthSettings:IpRateLimitPerMinute"] = ipLimit.ToString(),
                ["AuthSettings:UserRateLimitPerMinute"] = usernameLimit.ToString()
            }).Build();
            var db = new DbHelper(configuration, NullLogger<DbHelper>.Instance, new HttpContextAccessor());
            return new AuthRateLimiter(db, configuration);
        }

        private static string[] GetKeys(string username, IPAddress ip) =>
        [
            AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(ip)),
            AuthRateLimitIdentity.CreateKey("user", AuthRateLimitIdentity.NormalizeUsername(username))
        ];

        private static async Task ClearEventsAsync(string connectionString, string[] keys)
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM auth_rate_limit_events WHERE identity_key = ANY(@keys)";
            command.Parameters.AddWithValue("keys", keys);
            await command.ExecuteNonQueryAsync();
        }
    }
}
