using FlowCus.Helpers;
using FlowCus.Services;
using Moq;
using Xunit;

namespace FlowCus.Tests
{
    public class TaskCompletionTests
    {
        [Fact]
        public async Task ExplicitCompletionSetsCompletionTimestamp()
        {
            var db = new Mock<IDbHelper>();
            string? sql = null;
            db.Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((query, _) => sql = query)
                .ReturnsAsync(1);

            var service = new TaskService(db.Object);
            bool updated = await service.ToggleCompleteAsync(8, 4, true);

            Assert.True(updated);
            Assert.Contains("completed_on = CASE WHEN @IsCompleted THEN COALESCE(completed_on, now()) ELSE NULL END", sql);
        }

        [Fact]
        public async Task ToggleCompletionSetsOrClearsTimestampWithTheStateTransition()
        {
            var db = new Mock<IDbHelper>();
            string? sql = null;
            db.Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((query, _) => sql = query)
                .ReturnsAsync(1);

            var service = new TaskService(db.Object);
            bool updated = await service.ToggleCompleteAsync(8, 4);

            Assert.True(updated);
            Assert.Contains("completed_on = CASE WHEN is_completed THEN NULL ELSE now() END", sql);
        }
    }
}
