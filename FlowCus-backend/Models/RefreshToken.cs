using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlowCus.Models
{
    [Table("refresh_tokens")]
    public class RefreshToken
    {
        [Key]
        public int Id { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("token")]
        [Required, MaxLength(256)]
        public string Token { get; set; } = string.Empty;

        [Column("expires_on")]
        public DateTime ExpiresOn { get; set; }

        [Column("created_on")]
        public DateTime CreatedOn { get; set; }

        [Column("revoked_on")]
        public DateTime? RevokedOn { get; set; }

        [NotMapped]
        public bool IsActive => RevokedOn == null && DateTime.UtcNow < ExpiresOn;
    }
}