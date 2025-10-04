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

        // store hashed password here (bcrypt/argon2 output)
        [Required, MaxLength(255)]
        public string PasswordHash { get; set; } = null!;

        [MaxLength(100)]
        public string? Name { get; set; }

        public DateTime CreatedOn { get; set; }
        public int? CreatedBy { get; set; }      // optional: keeping ints for ownership/activity
        public DateTime? UpdatedOn { get; set; }
        public int? UpdatedBy { get; set; }

        // Navigation
        public virtual ICollection<TaskSubtype> TaskSubtypes { get; set; } = new List<TaskSubtype>();
        public virtual ICollection<TaskEntity> TaskEntities { get; set; } = new List<TaskEntity>();
        public virtual ICollection<Timetable> Timetables { get; set; } = new List<Timetable>();
    }
}
