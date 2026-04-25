using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("tasks")]
    public class TaskEntity
    {
        [Key]
        [Column("task_id")]
        public int TaskId { get; set; }

        [Column("task_category_id")]
        public int TaskCategoryId { get; set; }

        [Column("task_subtype_id")]
        public int? TaskSubtypeId { get; set; }

        [Column("title")]
        public string? Title { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("priority")]
        [Range(1, 5, ErrorMessage = "Priority must be between 1 and 5.")]
        public int? Priority { get; set; }

        [Column("created_on")]
        public DateTime CreatedOn { get; set; }

        [Column("created_by")]
        public int CreatedBy { get; set; }

        [Column("updated_on")]
        public DateTime? UpdatedOn { get; set; }

        [Column("start_time")]
        public DateTime? StartTime { get; set; }

        [Column("end_time")]
        public DateTime? EndTime { get; set; }

        [Column("duration_seconds")]
        public int? DurationSeconds { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; }
    }
}