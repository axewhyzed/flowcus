using FlowCus.Helpers;
using FlowCus.Services;
using FlowCus.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// 1. CORS: Ensure Credentials are allowed for Cookies to work
string[] allowedOrigins = builder.Environment.IsDevelopment()
    ? new[] { "http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8081", "http://localhost:3000", "http://10.0.2.2:5000" }
    : new[] { "https://axewhyzed.github.io", "https://flowcus.axewhyzedlabs.co.in" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("GlobalPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for sending Cookies
    });
});

builder.Services.AddControllers();

// Add Services to the container
builder.Services.AddScoped<IDbHelper, DbHelper>();
builder.Services.AddScoped<DbHelper>();
builder.Services.AddScoped<DBHelper>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<ITaskCategoryService, TaskCategoryService>();
builder.Services.AddScoped<TaskCategoryService>();
builder.Services.AddScoped<ITaskSubtypeService, TaskSubtypeService>();
builder.Services.AddScoped<TaskSubtypeService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<ITimetableService, TimetableService>();
builder.Services.AddScoped<TimetableService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<UserService>();

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
        RoleClaimType = ClaimTypes.Role
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // 1. Bearer header handled automatically.
            // 2. If no header, check "auth_session" cookie
            if (string.IsNullOrEmpty(context.Token))
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
            var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
            var dbHelper = context.HttpContext.RequestServices.GetRequiredService<IDbHelper>();

            var idClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;

            if (!int.TryParse(idClaim, out int userId))
            {
                context.Fail("Invalid token subject.");
                return;
            }

            string cacheKey = $"user_active_role_{userId}";
            if (!cache.TryGetValue(cacheKey, out (bool Exists, bool IsAdmin) userInfo))
            {
                var user = await dbHelper.QuerySingleAsync<dynamic>(
                    "SELECT is_admin FROM userlist WHERE id = @Id AND is_deleted = FALSE LIMIT 1",
                    new { Id = userId });

                if (user == null)
                {
                    cache.Set(cacheKey, (Exists: false, IsAdmin: false), TimeSpan.FromSeconds(30));
                    context.Fail("User no longer exists.");
                    return;
                }

                userInfo = (Exists: true, IsAdmin: (bool)user.is_admin);
                cache.Set(cacheKey, userInfo, TimeSpan.FromSeconds(120));
            }
            else if (!userInfo.Exists)
            {
                context.Fail("User no longer exists.");
                return;
            }

            string currentRole = userInfo.IsAdmin ? "Admin" : "User";
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

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = "An internal server error occurred." });
    });
});

app.UseHttpsRedirection();

app.UseCors("GlobalPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
