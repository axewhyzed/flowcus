using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;

namespace FlowCus.Models
{
    /// <summary>
    /// Represents a task with associated details such as title, description, priority, and timestamps.
    /// </summary>
    public class Task
    {
        [Key]
        public int TaskId { get; set; }

        [StringLength(100, ErrorMessage = "Title cannot exceed 100 characters")]
        public string? Title { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        /// <summary>
        /// Priority level of the task (1 - High, 2 - Normal, 3 - Low).
        /// </summary>
        [Range(1, 3, ErrorMessage = "Priority must be 1 (High), 2 (Normal), or 3 (Low)")]
        public int? Priority { get; set; }

        public DateTime? CreatedOn { get; set; } = DateTime.UtcNow;

        public int? CreatedBy { get; set; }

        public DateTime? UpdatedOn { get; set; }

        public int? UpdatedBy { get; set; }

        public DateTime? StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        public int? DurationSeconds { get; set; }

        public bool? IsDeleted { get; set; } = false;

        public bool? IsCompleted { get; set; }

        /// <summary>
        /// Calculates and sets the duration of the task based on StartTime and EndTime.
        /// </summary>
        public void CalculateDuration()
        {
            if (StartTime.HasValue && EndTime.HasValue)
            {
                DurationSeconds = (int)(EndTime.Value - StartTime.Value).TotalSeconds;
            }
        }
    }
}