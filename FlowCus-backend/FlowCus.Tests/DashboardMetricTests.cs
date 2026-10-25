using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services;
using Moq;

namespace FlowCus.Tests
{
    public class DashboardMetricTests
    {
        [Fact]
        public void TotalSessionsIsAnObsoleteAliasForCompletedTasks()
        {
            var property = typeof(DashboardStatsResponse).GetProperty("TotalSessions");

            Assert.NotNull(property);
            Assert.NotNull(Attribute.GetCustomAttribute(property!, typeof(ObsoleteAttribute)));
            Assert.Contains("CompletedTasks", property!.GetCustomAttributes(typeof(ObsoleteAttribute), false)
                .Cast<ObsoleteAttribute>().Single().Message);
        }

        [Fact]
        public async Task DashboardStreakQueryUsesCompletedOnAndExcludesDeletedOrPendingTasks()
        {
            var db = new Mock<IDbHelper>();
            string? completionSql = null;
            var timeZone = ClientTimeZone.FromIanaId("Asia/Kolkata");
            DateOnly localToday = DateOnly.FromDateTime(timeZone.ToLocal(DateTime.UtcNow));

            db.Setup(d => d.QuerySingleAsync<dynamic>(It.IsAny<string>(), It.IsAny<object?>()))
                .Returns(Task.FromResult<dynamic?>(null));
            db.Setup(d => d.QueryAsync<dynamic>(It.IsAny<string>(), It.IsAny<object?>()))
                .Returns(Task.FromResult<IEnumerable<dynamic>>(Array.Empty<dynamic>()));
            db.Setup(d => d.QueryAsync<DateTime>(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((sql, _) => completionSql = sql)
                .ReturnsAsync(new[]
                {
                    localToday.ToDateTime(TimeOnly.MinValue),
                    localToday.AddDays(-1).ToDateTime(TimeOnly.MinValue)
                });
            db.Setup(d => d.ExecuteScalarAsync<int>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(0);
            db.Setup(d => d.ExecuteScalarAsync<double>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(0);

            var service = new DashboardService(db.Object);
            var result = await service.GetDashboardStatsAsync(7, timeZone);

            Assert.Equal(2, result.StreakDays);
            Assert.NotNull(completionSql);
            Assert.Contains("completed_on", completionSql, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("is_completed = TRUE", completionSql, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("is_deleted = FALSE", completionSql, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("created_on", completionSql, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("@TimeZoneId", completionSql, StringComparison.Ordinal);
        }
    }
}
