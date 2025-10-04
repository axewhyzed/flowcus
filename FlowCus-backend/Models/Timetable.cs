using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("timetables")]
    public class Timetable
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;

        [Required, MaxLength(100)]
        public string Name { get; set; } = null!;

        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedAt { get; set; }

        public virtual ICollection<TimetableItem> TimetableItems { get; set; } = new List<TimetableItem>();
    }
}
