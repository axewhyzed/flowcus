using FlowCus.Helpers;
using FlowCus.Services; //
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims; // Needed for ClaimTypes

var builder = WebApplication.CreateBuilder(args);

// 1. CORS: Ensure Credentials are allowed for Cookies to work
string[] allowedOrigins = builder.Environment.IsDevelopment()
    ? new[] { "http://localhost:4200" }
    : new[] { "https://axewhyzed.github.io", "https://flowcus.axewhyzedlabs.co.in" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("GlobalPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // IMPORTANT: Required for sending Cookies
    });
});

builder.Services.AddControllers();

// Add Services to the container
builder.Services.AddScoped<DBHelper>();
builder.Services.AddScoped<AuthService>(); // NEW: Register Auth Service

// NEW SERVICES
builder.Services.AddScoped<FlowCus.Services.DashboardService>();
builder.Services.AddScoped<FlowCus.Services.TaskCategoryService>();
builder.Services.AddScoped<FlowCus.Services.TaskSubtypeService>();
builder.Services.AddScoped<FlowCus.Services.TaskService>();
builder.Services.AddScoped<FlowCus.Services.TimetableService>();
builder.Services.AddScoped<FlowCus.Services.UserService>(); // For profile management

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Configuration error: Jwt:Key is missing.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.Zero,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

        // CRITICAL FIX: Map the standard "role" claim to the framework's Role logic
        RoleClaimType = ClaimTypes.Role
    };

    //auto cookie handling logic
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // 1. Try to get token from "Authorization: Bearer" header (Mobile/Postman)
            // The framework does this automatically, but we can explicitly check or fallback.
            
            // 2. If no header, check "auth_session" cookie (Web)
            if (string.IsNullOrEmpty(context.Token)) // Token is null if no Bearer header found yet
            {
                if (context.Request.Cookies.ContainsKey("auth_session"))
                {
                    context.Token = context.Request.Cookies["auth_session"];
                }
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var dbHelper = context.HttpContext.RequestServices.GetRequiredService<DBHelper>();

            var idClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;

            if (!int.TryParse(idClaim, out int userId))
            {
                context.Fail("Invalid token subject.");
                return;
            }

            var user = await dbHelper.QuerySingleAsync<dynamic>(
                "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1",
                new { Id = userId });

            if (user == null)
            {
                context.Fail("User no longer exists.");
                return;
            }

            string currentRole = user.is_admin ? "Admin" : "User";
            if (!string.Equals(roleClaim, currentRole, StringComparison.Ordinal))
            {
                context.Fail("User role is no longer valid.");
            }
        }
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();
builder.Services.AddLogging();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("GlobalPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
