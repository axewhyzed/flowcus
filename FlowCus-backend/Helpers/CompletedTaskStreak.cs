namespace FlowCus.Helpers
{
    public static class CompletedTaskStreak
    {
        public static int Calculate(IEnumerable<DateOnly> completedLocalDates, DateOnly localToday)
        {
            ArgumentNullException.ThrowIfNull(completedLocalDates);
            var dates = completedLocalDates.ToHashSet();
            DateOnly current = dates.Contains(localToday) ? localToday : localToday.AddDays(-1);

            int streak = 0;
            while (dates.Contains(current))
            {
                streak++;
                current = current.AddDays(-1);
            }

            return streak;
        }
    }
}
