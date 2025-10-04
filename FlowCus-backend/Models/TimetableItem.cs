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

        public int TimetableId { get; set; }
        public virtual Timetable Timetable { get; set; } = null!;

        // required category
        public int TaskCategoryId { get; set; }
        public virtual TaskCategory TaskCategory { get; set; } = null!;

        // optional subtype
        public int? TaskSubtypeId { get; set; }
        public virtual TaskSubtype? TaskSubtype { get; set; }

        // 0 = Sunday .. 6 = Saturday
        public int DayOfWeek { get; set; }

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }

        public bool IsDeleted { get; set; }
    }
}
