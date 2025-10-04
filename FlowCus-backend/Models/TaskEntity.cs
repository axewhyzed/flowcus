using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("tasks")]
    public class TaskEntity
    {
        [Key]
        public int TaskId { get; set; }

        // required broad category
        public int TaskCategoryId { get; set; }
        public virtual TaskCategory TaskCategory { get; set; } = null!;

        // optional finer subtype
        public int? TaskSubtypeId { get; set; }
        public virtual TaskSubtype? TaskSubtype { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public int? Priority { get; set; }

        public DateTime CreatedOn { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? UpdatedOn { get; set; }

        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }

        public int? DurationSeconds { get; set; }
        public bool IsDeleted { get; set; }

        // Navigation: CreatedBy user
        public virtual User? User { get; set; }
    }
}
