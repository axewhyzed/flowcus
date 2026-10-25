namespace FlowCus.Models
{
    public sealed class DashboardStatsResponse
    {
        public string UserName { get; init; } = "User";
        public bool IsAdmin { get; init; }
        public int PendingTasks { get; init; }
        public int TotalTasks { get; init; }
        public int CompletedTasks { get; init; }
        public double CompletionRate { get; init; }
        public string DailyAvg { get; init; } = "0h";

        /// <summary>Deprecated compatibility alias for completedTasks. This is not a focus-session count.</summary>
        [Obsolete("Use CompletedTasks. This compatibility alias does not represent focus sessions.")]
        public int TotalSessions => CompletedTasks;

        public int StreakDays { get; init; }
        public int TotalCategories { get; init; }
        public List<dynamic> TodayTasks { get; init; } = [];
        public List<dynamic> TodayTimetable { get; init; } = [];
    }
}
