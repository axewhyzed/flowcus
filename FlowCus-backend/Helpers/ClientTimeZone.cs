namespace FlowCus.Helpers
{
    /// <summary>
    /// A user's named timezone, or the fixed-offset fallback used by older clients.
    /// Legacy offset minutes follow JavaScript getTimezoneOffset: UTC minus local time.
    /// </summary>
    public sealed class ClientTimeZone
    {
        private readonly TimeZoneInfo? _timeZone;
        private readonly string? _ianaTimeZoneId;
        private readonly int _legacyOffsetMinutes;

        private ClientTimeZone(TimeZoneInfo? timeZone, string? ianaTimeZoneId, int legacyOffsetMinutes)
        {
            _timeZone = timeZone;
            _ianaTimeZoneId = ianaTimeZoneId;
            _legacyOffsetMinutes = legacyOffsetMinutes;
        }

        public string? IanaTimeZoneId => _ianaTimeZoneId;

        public static ClientTimeZone FromIanaId(string timeZoneId)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId) || !LooksLikeIanaId(timeZoneId))
                throw new TimeZoneNotFoundException("Timezone must be a valid IANA timezone ID.");

            try
            {
                return new ClientTimeZone(TimeZoneInfo.FindSystemTimeZoneById(timeZoneId), timeZoneId, 0);
            }
            catch (TimeZoneNotFoundException)
            {
                throw new TimeZoneNotFoundException("Timezone must be a valid IANA timezone ID.");
            }
            catch (InvalidTimeZoneException)
            {
                throw new TimeZoneNotFoundException("Timezone data is invalid on this server.");
            }
        }

        public static ClientTimeZone FromLegacyOffset(int? offsetMinutes) =>
            new(null, null, offsetMinutes is >= -840 and <= 840 ? offsetMinutes.Value : 0);

        public DateTime ToLocal(DateTime utc)
        {
            DateTime normalizedUtc = AsUtc(utc);
            if (_timeZone != null)
                return TimeZoneInfo.ConvertTimeFromUtc(normalizedUtc, _timeZone);

            return DateTime.SpecifyKind(normalizedUtc.AddMinutes(-_legacyOffsetMinutes), DateTimeKind.Unspecified);
        }

        public DateTime ToUtc(DateTime localTime)
        {
            DateTime unspecifiedLocal = DateTime.SpecifyKind(localTime, DateTimeKind.Unspecified);
            if (_timeZone == null)
                return DateTime.SpecifyKind(unspecifiedLocal.AddMinutes(_legacyOffsetMinutes), DateTimeKind.Utc);

            DateTime resolvedLocal = ResolveInvalidLocalTime(unspecifiedLocal, _timeZone);
            if (_timeZone.IsAmbiguousTime(resolvedLocal))
            {
                // The larger UTC offset produces the earlier of the two UTC instants.
                TimeSpan earlierOccurrenceOffset = _timeZone.GetAmbiguousTimeOffsets(resolvedLocal).Max();
                return new DateTimeOffset(resolvedLocal, earlierOccurrenceOffset).UtcDateTime;
            }

            return TimeZoneInfo.ConvertTimeToUtc(resolvedLocal, _timeZone);
        }

        public DateTime StartOfLocalDateUtc(DateOnly localDate) =>
            ToUtc(localDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified));

        public (DateTime StartUtc, DateTime EndUtc) LocalDateBoundsUtc(DateOnly localDate) =>
            (StartOfLocalDateUtc(localDate), StartOfLocalDateUtc(localDate.AddDays(1)));

        public int CurrentOffsetMinutes(DateTime utcNow)
        {
            if (_timeZone == null) return _legacyOffsetMinutes;
            return -(int)_timeZone.GetUtcOffset(AsUtc(utcNow)).TotalMinutes;
        }

        public (DateTime StartUtc, DateTime? EndUtc) ShiftTaskToNextLocalDate(DateTime startUtc, DateTime? endUtc)
        {
            DateTime utcStart = AsUtc(startUtc);
            DateTime localStart = ToLocal(utcStart);
            DateTime nextLocalStart = DateTime.SpecifyKind(localStart.AddDays(1), DateTimeKind.Unspecified);
            DateTime shiftedStartUtc = ToUtc(nextLocalStart);
            DateTime? shiftedEndUtc = endUtc.HasValue
                ? shiftedStartUtc.Add(AsUtc(endUtc.Value) - utcStart)
                : null;
            return (shiftedStartUtc, shiftedEndUtc);
        }

        private static DateTime ResolveInvalidLocalTime(DateTime localTime, TimeZoneInfo zone)
        {
            DateTime candidate = localTime;
            for (int attempt = 0; zone.IsInvalidTime(candidate); attempt++)
            {
                if (attempt >= 4)
                    throw new InvalidTimeZoneException("Could not resolve a nonexistent local time.");

                DateTime before = FindNearestValid(candidate, zone, -1);
                DateTime after = FindNearestValid(candidate, zone, 1);
                TimeSpan gap = zone.GetUtcOffset(after) - zone.GetUtcOffset(before);
                if (gap <= TimeSpan.Zero)
                    throw new InvalidTimeZoneException("Could not determine the timezone transition gap.");

                // Preserve the position within a spring-forward gap (for example,
                // 02:30 becomes 03:30 in a one-hour transition).
                candidate = candidate.Add(gap);
            }

            return candidate;
        }

        private static DateTime FindNearestValid(DateTime value, TimeZoneInfo zone, int direction)
        {
            DateTime candidate = value;
            for (int minute = 0; minute < 2880; minute++)
            {
                candidate = candidate.AddMinutes(direction);
                if (!zone.IsInvalidTime(candidate)) return candidate;
            }

            throw new InvalidTimeZoneException("Could not find a valid local time around the timezone transition.");
        }

        private static DateTime AsUtc(DateTime value) =>
            value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

        private static bool LooksLikeIanaId(string value) =>
            value == "UTC" || value == "Etc/UTC" || value == "GMT" || value.Contains('/');
    }
}
