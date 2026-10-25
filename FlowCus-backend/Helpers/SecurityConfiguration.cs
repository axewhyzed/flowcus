namespace FlowCus.Helpers
{
    public static class SecurityConfiguration
    {
        public static string[] GetAllowedOrigins(IWebHostEnvironment environment) => environment.IsDevelopment()
            ? new[] { "http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8081", "http://localhost:3000", "http://10.0.2.2:5000" }
            : new[] { "https://axewhyzed.github.io", "https://flowcus.axewhyzedlabs.co.in" };
    }
}
