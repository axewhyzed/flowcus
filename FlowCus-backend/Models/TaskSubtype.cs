using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace FlowCus.Models
{
    // per-user subtype (previously TaskTemplate)
    [Table("task_subtypes")]
    public class TaskSubtype
    {
        [Key]
        public int Id { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [JsonIgnore]
        public virtual User User { get; set; } = null!;

        [Column("category_id")]
        public int CategoryId { get; set; }

        [JsonIgnore]
        public virtual TaskCategory Category { get; set; } = null!;

        [Required, MaxLength(120)]
        public string Name { get; set; } = null!;

        [Column("color_hex")]
        [MaxLength(7)]
        public string? ColorHex { get; set; }

        [Column("icon_name")]
        [MaxLength(150)]
        public string? IconName { get; set; }

        [Column("created_on")]
        public DateTime CreatedOn { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; }
        // Navigation
        public virtual ICollection<TaskEntity> TaskEntities { get; set; } = new List<TaskEntity>();
        public virtual ICollection<TimetableItem> TimetableItems { get; set; } = new List<TimetableItem>();
    }
}
