using System;
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

        [Column("color_hex")]
        public string? ColorHex { get; set; }

        [Column("icon_name")]
        public string? IconName { get; set; }

        [Column("created_on")]
        public DateTime CreatedOn { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; }
    }
}