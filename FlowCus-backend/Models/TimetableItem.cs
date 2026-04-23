using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("timetable_items")]
    public class TimetableItem
    {
        [Key]
        public int Id { get; set; }

        [Column("timetable_id")]
        public int TimetableId { get; set; }

        [Column("task_category_id")]
        public int TaskCategoryId { get; set; }

        [Column("task_subtype_id")]
        public int? TaskSubtypeId { get; set; }

        [Column("day_of_week")]
        public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday, etc.

        [Column("start_time")]
        public TimeSpan StartTime { get; set; }

        [Column("end_time")]
        public TimeSpan EndTime { get; set; }

        [Column("specific_date")]
        public DateTime? SpecificDate { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; }

        // -- Computed Properties (Not in Table, filled via JOINs) --
        [NotMapped] // or [Editable(false)] depending on Dapper extensions, usually plain Dapper ignores if not in INSERT string
        public string? TaskName { get; set; }

        [NotMapped]
        public string? CategoryName { get; set; }

        [NotMapped]
        public string? SubtypeName { get; set; }

        [NotMapped]
        public string? ColorHex { get; set; }
    }
}
