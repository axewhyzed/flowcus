using System.ComponentModel.DataAnnotations;
using System.ComponentModel;

namespace FlowCus.Models
{
    /// <summary>
    /// Represents a template item that specifies the day of the week, time range, and task details.
    /// </summary>
    public class TemplateItem
    {
        [Key]
        [DisplayName("Item ID")]
        public int Id { get; set; }

        [Required(ErrorMessage = "Template ID is required")]
        [DisplayName("Template ID")]
        public int TemplateId { get; set; }

        [Required(ErrorMessage = "Day of week is required")]
        [Range(0, 6, ErrorMessage = "Day of week must be 0-6 (Sunday-Saturday)")]
        [DisplayName("Day of Week")]
        public short DayOfWeek { get; set; }

        [Required(ErrorMessage = "Start time is required")]
        [DataType(DataType.Time)]
        [DisplayName("Start Time")]
        public TimeSpan StartTime { get; set; }

        [Required(ErrorMessage = "End time is required")]
        [DataType(DataType.Time)]
        [DisplayName("End Time")]
        public TimeSpan EndTime { get; set; }

        [Required(ErrorMessage = "Task title is required")]
        [StringLength(100, ErrorMessage = "Task title cannot exceed 100 characters")]
        [DisplayName("Task Title")]
        public string TaskTitle { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        [DataType(DataType.MultilineText)]
        [DisplayName("Task Description")]
        public string TaskDescription { get; set; }

        [DefaultValue(false)]
        [DisplayName("Deleted?")]
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="TemplateItem"/> class.
        /// Sets the default value for <see cref="IsDeleted"/>.
        /// </summary>
        public TemplateItem()
        {
            IsDeleted = false; // Default value for IsDeleted
        }
    }
}
