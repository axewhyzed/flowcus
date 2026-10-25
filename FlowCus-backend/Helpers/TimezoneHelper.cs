using Microsoft.AspNetCore.Http;

namespace FlowCus.Helpers
{
    public static class TimezoneHelper
    {
        public static bool TryResolveRequestTimeZone(
            HttpRequest request,
            out ClientTimeZone timeZone,
            out string? validationError,
            int? queryOffset = null)
        {
            if (request.Headers.ContainsKey("X-Timezone-Id"))
            {
                string? timeZoneId = request.Headers["X-Timezone-Id"].FirstOrDefault()?.Trim();
                try
                {
                    timeZone = ClientTimeZone.FromIanaId(timeZoneId ?? string.Empty);
                    validationError = null;
                    return true;
                }
                catch (TimeZoneNotFoundException ex)
                {
                    timeZone = ClientTimeZone.FromLegacyOffset(0);
                    validationError = ex.Message;
                    return false;
                }
            }

            timeZone = ClientTimeZone.FromLegacyOffset(GetOffsetMinutes(request, queryOffset));
            validationError = null;
            return true;
        }

        public static int? GetOffsetMinutes(HttpRequest request, int? queryOffset = null)
        {
            if (request.Headers.TryGetValue("X-Timezone-Id", out var zoneValues))
            {
                try
                {
                    var zone = ClientTimeZone.FromIanaId(zoneValues.FirstOrDefault()?.Trim() ?? string.Empty);
                    return zone.CurrentOffsetMinutes(DateTime.UtcNow);
                }
                catch (TimeZoneNotFoundException)
                {
                    return null;
                }
            }

            int? candidate = queryOffset;
            if (!candidate.HasValue && request.Headers.TryGetValue("X-Timezone-Offset", out var values) &&
                int.TryParse(values.FirstOrDefault(), out var headerOffset))
            {
                candidate = headerOffset;
            }

            return candidate is >= -840 and <= 840 ? candidate : null;
        }

        public static DateTime ToLocalTime(DateTime utcNow, int offsetMinutes)
        {
            var utc = utcNow.Kind == DateTimeKind.Utc ? utcNow : DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            return utc.AddMinutes(-offsetMinutes);
        }

        public static DateTime LocalMidnightToUtc(DateTime utcNow, int offsetMinutes)
        {
            var localNow = ToLocalTime(utcNow, offsetMinutes);
            return DateTime.SpecifyKind(localNow.Date.AddMinutes(offsetMinutes), DateTimeKind.Utc);
        }
    }
}
