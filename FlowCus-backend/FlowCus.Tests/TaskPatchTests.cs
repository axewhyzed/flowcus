using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services;
using Moq;
using System.Text.Json;
using Xunit;

namespace FlowCus.Tests
{
    public class TaskPatchTests
    {
        [Fact]
        public void PatchRequest_TracksOmittedAndExplicitNullFields()
        {
            var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            var omitted = JsonSerializer.Deserialize<TaskPatchRequest>("{\"priority\":3}", options)!;
            var cleared = JsonSerializer.Deserialize<TaskPatchRequest>("{\"startTime\":null}", options)!;

            Assert.True(omitted.HasPriority);
            Assert.False(omitted.HasStartTime);
            Assert.True(cleared.HasStartTime);
            Assert.Null(cleared.StartTime);
        }

        [Fact]
        public async Task PatchAsync_ChangesOnlySuppliedFields()
        {
            var existing = new TaskEntity
            {
                TaskId = 12,
                CreatedBy = 7,
                Title = "Write report",
                TaskCategoryId = 3,
                Priority = 2,
                IsCompleted = false
            };
            var db = new Mock<IDbHelper>();
            db.Setup(x => x.QuerySingleAsync<TaskEntity>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(existing);
            db.Setup(x => x.ExecuteScalarAsync<long>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(1L);
            string? updateSql = null;
            object? updateParameters = null;
            db.Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((sql, parameters) => { updateSql = sql; updateParameters = parameters; })
                .ReturnsAsync(1);

            var service = new TaskService(db.Object);
            bool updated = await service.PatchAsync(12, 7, new TaskPatchRequest { Priority = 4 });

            Assert.True(updated);
            Assert.Contains("priority = @Priority", updateSql);
            Assert.DoesNotContain("title = @Title", updateSql);
            Assert.Equal(4, ((Dictionary<string, object?>)updateParameters!)["Priority"]);
        }

        [Fact]
        public async Task PatchAsync_ClearsNullableScheduleFieldWhenNullIsExplicit()
        {
            var existing = new TaskEntity
            {
                TaskId = 12,
                CreatedBy = 7,
                Title = "Write report",
                TaskCategoryId = 3,
                StartTime = DateTime.UtcNow,
                IsCompleted = false
            };
            var db = new Mock<IDbHelper>();
            db.Setup(x => x.QuerySingleAsync<TaskEntity>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(existing);
            db.Setup(x => x.ExecuteScalarAsync<long>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(1L);
            string? updateSql = null;
            db.Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((sql, _) => updateSql = sql)
                .ReturnsAsync(1);

            var service = new TaskService(db.Object);
            bool updated = await service.PatchAsync(12, 7, new TaskPatchRequest { StartTime = null });

            Assert.True(updated);
            Assert.Contains("start_time = @StartTime", updateSql);
        }

        [Fact]
        public async Task PatchAsync_AutomaticallyClearsSubtypeWhenCategoryChanges()
        {
            var existing = new TaskEntity
            {
                TaskId = 12,
                CreatedBy = 7,
                Title = "Write report",
                TaskCategoryId = 3,
                TaskSubtypeId = 41,
                IsCompleted = false
            };
            var db = new Mock<IDbHelper>();
            db.Setup(x => x.QuerySingleAsync<TaskEntity>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(existing);
            db.Setup(x => x.ExecuteScalarAsync<int?>(It.Is<string>(sql => sql.Contains("SELECT category_id")), It.IsAny<object?>()))
                .ReturnsAsync(3);
            db.Setup(x => x.ExecuteScalarAsync<long>(It.IsAny<string>(), It.IsAny<object?>()))
                .ReturnsAsync(1L);
            string? updateSql = null;
            object? updateParameters = null;
            db.Setup(x => x.ExecuteAsync(It.IsAny<string>(), It.IsAny<object?>()))
                .Callback<string, object?>((sql, parameters) => { updateSql = sql; updateParameters = parameters; })
                .ReturnsAsync(1);

            var service = new TaskService(db.Object);
            bool updated = await service.PatchAsync(12, 7, new TaskPatchRequest { TaskCategoryId = 4 });

            Assert.True(updated);
            Assert.Contains("task_subtype_id = @TaskSubtypeId", updateSql);
            Assert.Null(((Dictionary<string, object?>)updateParameters!)["TaskSubtypeId"]);
        }

        [Fact]
        public void IdempotencyKeys_AreValidatedAndPayloadFingerprintChangesWhenPayloadChanges()
        {
            Assert.True(IdempotencyKeyValidator.IsValid("session:123-abc"));
            Assert.False(IdempotencyKeyValidator.IsValid("bad key"));

            var task = new TaskEntity { Title = "Focus", TaskCategoryId = 1, Priority = 2 };
            string originalHash = TaskRequestHasher.Hash(task);
            Assert.Equal(originalHash, TaskRequestHasher.Hash(task));

            task.Priority = 3;
            Assert.NotEqual(originalHash, TaskRequestHasher.Hash(task));
        }
    }
}
