using FlowCus.Models;
using System.ComponentModel.DataAnnotations;
using Xunit;

namespace FlowCus.Tests
{
    public class TimetableValidationTests
    {
        [Theory]
        [InlineData(0)]
        [InlineData(3)]
        [InlineData(6)]
        public void TimetableItem_ValidDayOfWeek_PassesValidation(int day)
        {
            var item = new TimetableItem
            {
                TimetableId = 1,
                TaskCategoryId = 1,
                DayOfWeek = day,
                StartTime = TimeSpan.FromHours(9),
                EndTime = TimeSpan.FromHours(10)
            };

            var context = new ValidationContext(item);
            var results = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(item, context, results, true);

            Assert.True(isValid);
            Assert.Empty(results);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(7)]
        [InlineData(10)]
        public void TimetableItem_InvalidDayOfWeek_FailsValidation(int day)
        {
            var item = new TimetableItem
            {
                TimetableId = 1,
                TaskCategoryId = 1,
                DayOfWeek = day,
                StartTime = TimeSpan.FromHours(9),
                EndTime = TimeSpan.FromHours(10)
            };

            var context = new ValidationContext(item);
            var results = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(item, context, results, true);

            Assert.False(isValid);
            Assert.Contains(results, r => r.MemberNames.Contains("DayOfWeek"));
        }

        [Fact]
        public void TimetableItem_HasTitleAndTaskName()
        {
            var item = new TimetableItem
            {
                TaskName = "Deep Work",
                Title = "Deep Work"
            };

            Assert.Equal("Deep Work", item.TaskName);
            Assert.Equal("Deep Work", item.Title);
        }
    }
}
