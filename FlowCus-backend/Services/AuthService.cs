using FlowCus.Helpers;
using FlowCus.Models;
using FlowCus.Controllers;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace FlowCus.Services
{
    public class AuthService
    {
        private readonly DBHelper _db; // Renamed for brevity
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(DBHelper db, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _db = db;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<AuthResponse?> AuthenticateAsync(string username, string password, string ipAddress)
        {
            // 1. Get User using Dapper
            string sql = "SELECT * FROM userlist WHERE username = @Username LIMIT 1";
            var user = await _db.QuerySingleAsync<User>(sql, new { Username = username });

            if (user == null) return null; // User not found

            // 2. Verify Password
            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return null; // Invalid password
            }

            // 3. Generate Tokens
            return await GenerateAuthResponseAsync(user);
        }

        public async Task<AuthResponse> RefreshTokenAsync(string token)
        {
            // Find token in DB
            string sql = "SELECT * FROM refresh_tokens WHERE token = @Token LIMIT 1";
            var refreshToken = await _db.QuerySingleAsync<RefreshToken>(sql, new { Token = token });

            if (refreshToken == null) throw new SecurityTokenException("Invalid token");

            if (refreshToken.RevokedOn != null || refreshToken.ExpiresOn < DateTime.UtcNow)
                throw new SecurityTokenException("Token expired or revoked");

            // Get User
            string userSql = "SELECT * FROM userlist WHERE id = @Id";
            var user = await _db.QuerySingleAsync<User>(userSql, new { Id = refreshToken.UserId });

            if (user == null) throw new Exception("User not found");

            // Revoke old token
            string revokeSql = "UPDATE refresh_tokens SET revoked_on = now() WHERE token = @Token";
            await _db.ExecuteAsync(revokeSql, new { Token = token });

            // Generate new set
            return await GenerateAuthResponseAsync(user);
        }

        private async Task<AuthResponse> GenerateAuthResponseAsync(User user)
        {
            // 1. Access Token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? ""));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(15),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = creds
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var accessToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

            // 2. Refresh Token
            var newRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            string sql = @"INSERT INTO refresh_tokens (user_id, token, expires_on, created_on) VALUES (@UserId, @Token, @ExpiresOn, now())";
            await _db.ExecuteAsync(sql, new { UserId = user.Id, Token = newRefreshToken, ExpiresOn = DateTime.UtcNow.AddDays(7) });

            return new AuthResponse
            {
                Token = accessToken,
                RefreshToken = newRefreshToken,
                User = new UserDto { Id = user.Id, Username = user.Username, Name = user.Name, isAdmin = user.IsAdmin }
            };
        }
    }
}