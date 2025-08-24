using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Xml;

namespace FlowCus.Models
{
    [Table("userlist")]
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public DateTime CreatedOn { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedOn { get; set; }
        public string UpdatedBy { get; set; }

        public ICollection<TaskTemplate> TaskTemplates { get; set; }
        public ICollection<TaskEntity> TaskEntities { get; set; }
        public ICollection<Timetable> Timetables { get; set; }
    }

}
