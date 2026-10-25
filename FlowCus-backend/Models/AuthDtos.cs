namespace FlowCus.Models
{
    public class LoginResponse
    {
        public string Token { get; set; } = "";
        public string? CsrfToken { get; set; }
        public UserDto User { get; set; } = new();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = "";
        public string? Name { get; set; }
        public bool IsAdmin { get; set; }
    }
}
