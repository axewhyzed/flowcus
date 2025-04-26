using FlowCus.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FlowCus.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<WeatherForecastController> _logger;
        private readonly DbHelper _dbHelper;

        public WeatherForecastController(ILogger<WeatherForecastController> logger, DbHelper dbHelper)
        {
            _logger = logger;
            _dbHelper = dbHelper;
        }

        [HttpGet(Name = "GetWeatherForecast")]
        public IEnumerable<WeatherForecast> Get()
        {
            return Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            })
            .ToArray();
        }

        [HttpGet("testdb")]
        public async Task<IActionResult> TestDb()
        {
            bool isConnected = await _dbHelper.TestConnectionAsync();
            object? result = await _dbHelper.GetValue("select username from userlist");
            string username = result?.ToString() ?? string.Empty;
            if (isConnected)
                return Ok("Database connection successful!" + " username is: " + username);
            else
                return StatusCode(500, "Database connection failed.");
        }

    }
}
