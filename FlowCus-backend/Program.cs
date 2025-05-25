using FlowCus.Helpers;

var builder = WebApplication.CreateBuilder(args);

string[] allowedOrigins = new[]
{
    "http://localhost:4200",
    "https://axewhyzed.github.io"
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("GlobalPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    });
});
// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<DBHelper>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("GlobalPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();
