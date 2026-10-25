namespace FlowCus.Models
{
    public sealed class UserCreateRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Name { get; set; }
        public bool IsAdmin { get; set; }
    }
}
