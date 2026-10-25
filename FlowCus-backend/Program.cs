using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Services;
using FlowCus.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// 1. CORS: Ensure Credentials are allowed for Cookies to work
string[] allowedOrigins = SecurityConfiguration.GetAllowedOrigins(builder.Environment);

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
builder.Services.AddHttpContextAccessor();
ForwardedHeadersConfiguration.AddServices(builder.Services, builder.Configuration);

// Add Services to the container
builder.Services.AddScoped<IDbHelper, DbHelper>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IAuthRateLimiter, AuthRateLimiter>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ITaskCategoryService, TaskCategoryService>();
builder.Services.AddScoped<ITaskSubtypeService, TaskSubtypeService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ITimetableService, TimetableService>();
builder.Services.AddScoped<IUserService, UserService>();

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (!JwtConfigurationValidator.IsValidKey(jwtKey))
{
    throw new InvalidOperationException("Configuration error: Jwt:Key must be supplied through secure configuration, must be at least 32 bytes, and must not be the tracked placeholder value.");
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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
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
            var dbHelper = context.HttpContext.RequestServices.GetRequiredService<IDbHelper>();

            var idClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;
            var tokenVersionClaim = context.Principal?.FindFirst("token_version")?.Value;

            if (!int.TryParse(idClaim, out int userId) || !int.TryParse(tokenVersionClaim, out int tokenVersion))
            {
                context.Fail("Invalid token subject or version.");
                return;
            }

            var user = await dbHelper.QuerySingleAsync<TokenValidationState>(
                "SELECT is_admin AS IsAdmin, token_version AS TokenVersion FROM userlist WHERE id = @Id AND is_deleted = FALSE",
                new { Id = userId });

            if (user == null)
            {
                context.Fail("User no longer exists.");
                return;
            }

            if (user.TokenVersion != tokenVersion)
            {
                context.Fail("Session has been revoked.");
                return;
            }

            string currentRole = user.IsAdmin ? "Admin" : "User";
            if (!string.Equals(roleClaim, currentRole, StringComparison.Ordinal))
            {
                context.Fail("User role is no longer valid.");
            }
        }
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
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

// Apply only forwarded headers from explicitly configured proxies/networks before
// any middleware or endpoint reads the remote address or request scheme.
app.UseForwardedHeaders();

app.UseHttpsRedirection();

app.UseCors("GlobalPolicy");

app.UseAuthentication();
app.UseAuthorization();

// Cookie-authenticated unsafe requests require a trusted Origin and a matching
// double-submit CSRF token. Native clients authenticate with Bearer tokens and
// do not need a browser CSRF token.
app.Use(async (context, next) =>
{
    bool cookieLogin = HttpMethods.IsPost(context.Request.Method) &&
        string.Equals(context.Request.Path.Value, "/api/auth/login", StringComparison.OrdinalIgnoreCase) &&
        string.Equals(context.Request.Headers["X-Auth-Mode"].ToString(), "cookie", StringComparison.OrdinalIgnoreCase);
    if (cookieLogin)
    {
        if (!CsrfProtection.IsTrustedOrigin(context.Request.Headers["Origin"].FirstOrDefault(), allowedOrigins))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Untrusted request origin." });
            return;
        }
        await next();
        return;
    }

    if (!CsrfProtection.IsUnsafeMethod(context.Request.Method) ||
        !CsrfProtection.RequiresTokenValidation(
            context.Request.Cookies.ContainsKey("auth_session"),
            context.Request.Headers["Authorization"].ToString()))
    {
        await next();
        return;
    }

    string? origin = context.Request.Headers["Origin"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(origin) && context.Request.Headers["Referer"].FirstOrDefault() is string referer &&
        Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
    {
        origin = refererUri.GetLeftPart(UriPartial.Authority);
    }

    if (!CsrfProtection.IsTrustedOrigin(origin, allowedOrigins) ||
        !CsrfProtection.TokensMatch(
            context.Request.Cookies["XSRF-TOKEN"],
            context.Request.Headers["X-CSRF-Token"].FirstOrDefault()))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { error = "CSRF validation failed." });
        return;
    }

    await next();
});

app.MapControllers();

app.MapGet("/health", async (IDbHelper db) =>
{
    try
    {
        await db.ExecuteScalarAsync<int>("SELECT 1");
        return Results.Ok(new { status = "Healthy" });
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
}).AllowAnonymous();

app.Run();
