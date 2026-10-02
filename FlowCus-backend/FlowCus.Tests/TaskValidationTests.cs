using FlowCus.Models;
using System.ComponentModel.DataAnnotations;
using Xunit;

namespace FlowCus.Tests
{
    public class TaskValidationTests
    {
        [Theory]
        [InlineData(1)]
        [InlineData(3)]
        [InlineData(5)]
        public void TaskEntity_ValidPriority_PassesValidation(int priority)
        {
            var task = new TaskEntity
            {
                Title = "Test Task",
                Priority = priority,
                TaskCategoryId = 1
            };

            var context = new ValidationContext(task);
            var results = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(task, context, results, true);

            Assert.True(isValid);
            Assert.Empty(results);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(6)]
        [InlineData(-1)]
        [InlineData(10)]
        public void TaskEntity_InvalidPriority_FailsValidation(int priority)
        {
            var task = new TaskEntity
            {
                Title = "Test Task",
                Priority = priority,
                TaskCategoryId = 1
            };

            var context = new ValidationContext(task);
            var results = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(task, context, results, true);

            Assert.False(isValid);
            Assert.Contains(results, r => r.MemberNames.Contains("Priority"));
        }

        [Fact]
        public void TaskEntity_DefaultIsCompleted_IsFalse()
        {
            var task = new TaskEntity();
            Assert.False(task.IsCompleted);
        }

        [Fact]
        public void TaskEntity_CanToggleIsCompleted()
        {
            var task = new TaskEntity { IsCompleted = false };
            task.IsCompleted = true;
            Assert.True(task.IsCompleted);
        }
    }
}
