using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("userlist")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Username { get; set; } = null!;

        [Column("password_hash")]
        [Required, MaxLength(255)]
        public string PasswordHash { get; set; } = null!;

        [MaxLength(100)]
        public string? Name { get; set; }

        [Column("created_on")]
        public DateTime CreatedOn { get; set; }

        [Column("updated_on")]
        public DateTime? UpdatedOn { get; set; }

        [Column("failed_attempts")]
        public int FailedAttempts { get; set; }

        [Column("lockout_until")]
        public DateTime? LockoutUntil { get; set; }

        [Column("is_admin")]
        public bool IsAdmin { get; set; }

        // Navigation (Optional, Dapper ignores these unless explicitly mapped)
        public virtual ICollection<TaskSubtype> TaskSubtypes { get; set; } = new List<TaskSubtype>();
        public virtual ICollection<TaskEntity> TaskEntities { get; set; } = new List<TaskEntity>();
        public virtual ICollection<Timetable> Timetables { get; set; } = new List<Timetable>();
    }
}