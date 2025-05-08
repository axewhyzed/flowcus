using System.ComponentModel.DataAnnotations;
using System.ComponentModel;

namespace FlowCus.Models
{
    /// <summary>
    /// Represents a template list associated with a specific user.
    /// </summary>

    public class TemplateList
    {

        [Key]
        [DisplayName("Template ID")]
        public int Id { get; set; }

        [Required(ErrorMessage = "User ID is required")]
        [DisplayName("User ID")]
        public int UserId { get; set; }

        /// <summary>
        /// Gets or sets the name of the template list.
        /// </summary>
        [Required(ErrorMessage = "Template name is required")]
        [StringLength(50, ErrorMessage = "Template name cannot exceed 50 characters")]
        [DisplayName("Template Name")]
        public string TemplateName { get; set; }

        [DefaultValue(false)]
        [DisplayName("Deleted?")]
        public bool IsDeleted { get; set; }

        [Required]
        [DataType(DataType.DateTime)]
        [DisplayName("Created At")]
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="TemplateList"/> class.
        /// Sets the default value for <see cref="IsDeleted"/> and <see cref="CreatedAt"/>.
        /// </summary>
        public TemplateList()
        {
            IsDeleted = false; // Default value for IsDeleted
            CreatedAt = DateTime.Now; // Default value for CreatedAt
        }
    }
}
