using FlowCus.Helpers;

namespace FlowCus.Tests
{
    public class CompletedTaskStreakTests
    {
        [Fact]
        public void CreationWithoutCompletionDoesNotCreateAStreak()
        {
            Assert.Equal(0, CompletedTaskStreak.Calculate([], new DateOnly(2026, 10, 24)));
        }

        [Fact]
        public void TodayAnchorsTheStreakAndDuplicateCompletionsCountOnce()
        {
            var dates = new[]
            {
                new DateOnly(2026, 10, 22),
                new DateOnly(2026, 10, 23),
                new DateOnly(2026, 10, 23),
                new DateOnly(2026, 10, 24)
            };

            Assert.Equal(3, CompletedTaskStreak.Calculate(dates, new DateOnly(2026, 10, 24)));
        }

        [Fact]
        public void YesterdayAnchorsWhenTodayHasNoCompletion()
        {
            var dates = new[] { new DateOnly(2026, 10, 23), new DateOnly(2026, 10, 22) };

            Assert.Equal(2, CompletedTaskStreak.Calculate(dates, new DateOnly(2026, 10, 24)));
        }

        [Fact]
        public void GapResetsStreakAndOlderDatesDoNotCount()
        {
            var dates = new[]
            {
                new DateOnly(2026, 10, 24),
                new DateOnly(2026, 10, 22),
                new DateOnly(2026, 10, 21)
            };

            Assert.Equal(1, CompletedTaskStreak.Calculate(dates, new DateOnly(2026, 10, 24)));
        }
    }
}
