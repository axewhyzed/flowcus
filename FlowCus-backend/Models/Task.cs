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
        [DisplayName("Task ID")]
        public int TaskId { get; set; }

        [Required(ErrorMessage = "Title is required")]
        [StringLength(100, ErrorMessage = "Title cannot exceed 100 characters")]
        [DisplayName("Task Title")]
        public string Title { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        [DataType(DataType.MultilineText)]
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets the priority level of the task (1 - High, 2 - Normal, 3 - Low).
        /// </summary>
        [Required(ErrorMessage = "Priority is required")]
        [Range(1, 3, ErrorMessage = "Priority must be 1 (High), 2 (Normal), or 3 (Low)")]
        [DisplayName("Priority Level")]
        public int Priority { get; set; }

        [Required]
        [DataType(DataType.DateTime)]
        [DisplayName("Created On")]
        public DateTime CreatedOn { get; set; }

        /// <summary>
        /// Gets or sets the user ID who created the task.
        /// </summary>
        [Required(ErrorMessage = "Creator ID is required")]
        [DisplayName("Created By")]
        public int CreatedBy { get; set; }

        [DataType(DataType.DateTime)]
        [DisplayName("Last Updated")]
        public DateTime? UpdatedOn { get; set; }

        /// <summary>
        /// Gets or sets the user ID who last updated the task.
        /// </summary>
        [DisplayName("Updated By")]
        public int? UpdatedBy { get; set; }

        [DataType(DataType.DateTime)]
        [DisplayName("Start Time")]
        public DateTime? StartTime { get; set; }

        [DataType(DataType.DateTime)]
        [DisplayName("End Time")]
        public DateTime? EndTime { get; set; }

        [DisplayName("Duration (seconds)")]
        public int? DurationSeconds { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the task is marked as deleted.
        /// </summary>
        [DefaultValue(false)]
        [DisplayName("Deleted?")]
        public bool IsDeleted { get; set; } // BOOLEAN DEFAULT FALSE


        // Optional constructor for easier instantiation (if needed)
        /// <summary>
        /// Initializes a new instance of the <see cref="Task"/> class.
        /// Sets the default values for <see cref="IsDeleted"/> and <see cref="CreatedOn"/>.
        /// </summary>
        public Task()
        {
            IsDeleted = false; // Default value for IsDeleted
            CreatedOn = DateTime.Now; // Set current time as default for CreatedOn
        }

        /// <summary>
        /// Calculates the duration of the task in seconds, based on the <see cref="StartTime"/> and <see cref="EndTime"/>.
        /// </summary>
        public void CalculateDuration()
        {
            if (StartTime.HasValue && EndTime.HasValue)
            {
                DurationSeconds = (int)(EndTime.Value - StartTime.Value).TotalSeconds;
            }
            else
            {
                DurationSeconds = null;
            }
        }
    }
}
