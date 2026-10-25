using FlowCus.Helpers;
using Microsoft.AspNetCore.Http;

namespace FlowCus.Tests
{
    public class ClientTimeZoneTests
    {
        [Fact]
        public void LocalDateBoundsUseSeparateNamedZoneMidnightsAcrossSpringForward()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            var (start, end) = zone.LocalDateBoundsUtc(new DateOnly(2024, 3, 10));

            Assert.Equal(Utc(2024, 3, 10, 5), start);
            Assert.Equal(Utc(2024, 3, 11, 4), end);
            Assert.Equal(TimeSpan.FromHours(23), end - start);
        }

        [Fact]
        public void LocalDateBoundsRepresentTwentyFiveHourFallBackDay()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            var (start, end) = zone.LocalDateBoundsUtc(new DateOnly(2024, 11, 3));

            Assert.Equal(Utc(2024, 11, 3, 4), start);
            Assert.Equal(Utc(2024, 11, 4, 5), end);
            Assert.Equal(TimeSpan.FromHours(25), end - start);
        }

        [Fact]
        public void NonexistentSpringForwardTimeMovesByTheTransitionGap()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            DateTime shifted = zone.ToUtc(new DateTime(2024, 3, 10, 2, 30, 0));

            Assert.Equal(Utc(2024, 3, 10, 7, 30), shifted);
            Assert.Equal(new DateTime(2024, 3, 10, 3, 30, 0), zone.ToLocal(shifted));
        }

        [Fact]
        public void AmbiguousFallBackTimeUsesEarlierOccurrence()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            DateTime shifted = zone.ToUtc(new DateTime(2024, 11, 3, 1, 30, 0));

            Assert.Equal(Utc(2024, 11, 3, 5, 30), shifted);
        }

        [Fact]
        public void RolloverPreservesLocalStartAndElapsedDurationAcrossDstGap()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            DateTime sourceStart = Utc(2024, 3, 9, 7, 30); // 02:30 EST
            DateTime sourceEnd = sourceStart.AddHours(2);

            var shifted = zone.ShiftTaskToNextLocalDate(sourceStart, sourceEnd);

            Assert.Equal(Utc(2024, 3, 10, 7, 30), shifted.StartUtc); // shifted to 03:30 EDT
            Assert.NotNull(shifted.EndUtc);
            Assert.Equal(TimeSpan.FromHours(2), shifted.EndUtc!.Value - shifted.StartUtc);
        }

        [Fact]
        public void RolloverPreservesAnOvernightTasksElapsedDurationAcrossDst()
        {
            var zone = ClientTimeZone.FromIanaId("America/New_York");
            DateTime sourceStart = Utc(2024, 3, 10, 4, 30); // 23:30 EST on March 9
            DateTime sourceEnd = Utc(2024, 3, 10, 7, 30); // 03:30 EDT on March 10

            var shifted = zone.ShiftTaskToNextLocalDate(sourceStart, sourceEnd);

            Assert.Equal(Utc(2024, 3, 11, 3, 30), shifted.StartUtc); // 23:30 EDT on March 10
            Assert.NotNull(shifted.EndUtc);
            Assert.Equal(TimeSpan.FromHours(3), shifted.EndUtc!.Value - shifted.StartUtc);
        }

        [Fact]
        public void RolloverLeavesUnscheduledEndAbsentAndKeepsLegacyOffsetSupport()
        {
            var legacyZone = ClientTimeZone.FromLegacyOffset(-330);
            var shifted = legacyZone.ShiftTaskToNextLocalDate(Utc(2024, 1, 1, 4), null);

            Assert.Equal(Utc(2024, 1, 2, 4), shifted.StartUtc);
            Assert.Null(shifted.EndUtc);
        }

        [Fact]
        public void InvalidNamedTimezoneIsRejectedInsteadOfUsingOffsetFallback()
        {
            var context = new DefaultHttpContext();
            context.Request.Headers["X-Timezone-Id"] = "Not/A_Real_Zone";
            context.Request.Headers["X-Timezone-Offset"] = "330";

            bool valid = TimezoneHelper.TryResolveRequestTimeZone(context.Request, out _, out var error);

            Assert.False(valid);
            Assert.NotNull(error);
        }

        [Fact]
        public void MissingNamedTimezoneContinuesToUseLegacyOffsetHeader()
        {
            var context = new DefaultHttpContext();
            context.Request.Headers["X-Timezone-Offset"] = "-330";

            bool valid = TimezoneHelper.TryResolveRequestTimeZone(context.Request, out var zone, out var error);

            Assert.True(valid);
            Assert.Null(error);
            Assert.Equal(Utc(2023, 12, 31, 18, 30), zone.StartOfLocalDateUtc(new DateOnly(2024, 1, 1)));
        }

        private static DateTime Utc(int year, int month, int day, int hour, int minute = 0) =>
            new(year, month, day, hour, minute, 0, DateTimeKind.Utc);
    }
}
