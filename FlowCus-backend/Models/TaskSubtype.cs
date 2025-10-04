using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    // per-user subtype (previously TaskTemplate)
    [Table("task_subtypes")]
    public class TaskSubtype
    {
        [Key]
        public int Id { get; set; }

        // owner
        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;

        // category bucket
        public int CategoryId { get; set; }
        public virtual TaskCategory Category { get; set; } = null!;

        [Required, MaxLength(120)]
        public string Name { get; set; } = null!;

        [MaxLength(7)]
        public string? ColorHex { get; set; }

        [MaxLength(150)]
        public string? IconName { get; set; }

        public DateTime CreatedOn { get; set; }
        public bool IsDeleted { get; set; }

        // Navigation
        public virtual ICollection<TaskEntity> TaskEntities { get; set; } = new List<TaskEntity>();
        public virtual ICollection<TimetableItem> TimetableItems { get; set; } = new List<TimetableItem>();
    }
}
