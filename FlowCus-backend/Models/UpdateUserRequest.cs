namespace FlowCus.Models
{
    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public bool? IsAdmin { get; set; }
        public string? Password { get; set; }
    }
}
