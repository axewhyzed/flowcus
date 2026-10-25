# FlowCus

## Trusted reverse proxies

Forwarded client IPs and schemes are ignored by default. When the API is behind a
reverse proxy, configure `ForwardedHeaders:Enabled=true` and explicitly list the
proxy IPs or CIDR networks in `ForwardedHeaders:KnownProxies` or
`ForwardedHeaders:KnownNetworks`. Set `ForwardedHeaders:ForwardLimit` to the
number of trusted proxy hops (1 by default, maximum 10). Use deployment environment
variables or secret/configuration management, for example:

```text
ForwardedHeaders__Enabled=true
ForwardedHeaders__KnownProxies__0=10.0.0.8
ForwardedHeaders__ForwardLimit=1
```

Do not enable forwarded headers with an empty allowlist. The API trusts only
`X-Forwarded-For` and `X-Forwarded-Proto` values supplied through that allowlist.
Login IP limits use the resulting remote address. Without a trusted-proxy entry,
requests arriving through one reverse proxy share that proxy's IP limit. The
production settings template keeps forwarding disabled with empty allowlists;
populate the exact deployed proxy addresses or networks before enabling it.

## Timezone and dashboard metric contracts

Timezone-sensitive endpoints accept `X-Timezone-Id` with an IANA timezone such
as `Asia/Kolkata` or `America/New_York`. Invalid supplied IDs return HTTP 400.
Older clients may omit it and continue using the existing `X-Timezone-Offset`
or `timezoneOffset` query parameter; that fallback is a fixed offset and cannot
represent daylight-saving changes.

Task rollover moves only unfinished tasks scheduled on the previous local
calendar date. The new start keeps its local wall-clock time. A nonexistent
spring-forward time moves forward by the DST gap; an ambiguous fall-back time
uses its earlier occurrence. An existing task end moves by the original elapsed
duration, and an absent end remains absent.

`streakDays` counts consecutive local calendar dates with at least one completed,
nondeleted task, using `completedOn`; unscheduled tasks count. It starts at today
when there is a completion today, otherwise yesterday. `completedTasks` is the
all-time count of completed nondeleted tasks. `totalSessions` is a deprecated
compatibility alias for `completedTasks`; it does not represent focus sessions.

## Database setup

Fresh schemas should include `FlowCus-db/tables/userlist.sql`. Existing databases
must apply `FlowCus-db/migrations/20261024_sliding_auth_rate_limits.sql` before
deploying this API version. It adds the shared event table used by all API
instances; the former fixed-window table is retained only for rolling-deployment
compatibility and is no longer read by the application.

The database-backed concurrency integration checks are opt-in. Run them only
against a disposable database after the migration is installed:

```powershell
$env:FLOWCUS_TEST_DATABASE = "Host=localhost;Database=flowcus_test;Username=...;Password=..."
dotnet test FlowCus.Tests/FlowCus.Tests.csproj --filter FullyQualifiedName~AuthRateLimiterPostgresIntegrationTests
```
