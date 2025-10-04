using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("task_category")]
    public class TaskCategory
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public string Name { get; set; } = null!;

        public string? Description { get; set; }

        [MaxLength(7)]
        public string? ColorHex { get; set; }

        [MaxLength(150)]
        public string? IconName { get; set; }

        public DateTime CreatedOn { get; set; }
        public bool IsDeleted { get; set; }

        // Navigation
        public virtual ICollection<TaskSubtype> TaskSubtypes { get; set; } = new List<TaskSubtype>();
        public virtual ICollection<TaskEntity> TaskEntities { get; set; } = new List<TaskEntity>();
        public virtual ICollection<TimetableItem> TimetableItems { get; set; } = new List<TimetableItem>();
    }
}
