using System.Net;
using FlowCus.Helpers;
using FlowCus.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using FlowCus.Controllers;
using FlowCus.Models;
using FlowCus.Services.Interfaces;
using Moq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FlowCus.Tests
{
    public class AuthRateLimitTests
    {
        [Fact]
        public void Ipv4MappedIpv6AndIpv4ShareAnIdentity()
        {
            var ipv4 = IPAddress.Parse("192.0.2.14");
            var mapped = IPAddress.Parse("::ffff:192.0.2.14");

            Assert.Equal(AuthRateLimitIdentity.NormalizeIp(ipv4), AuthRateLimitIdentity.NormalizeIp(mapped));
            Assert.Equal(
                AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(ipv4)),
                AuthRateLimitIdentity.CreateKey("ip", AuthRateLimitIdentity.NormalizeIp(mapped)));
        }

        [Fact]
        public void UsernameIdentityIgnoresCaseAndCompatibilityUnicodeForms()
        {
            string composed = AuthRateLimitIdentity.NormalizeUsername("  Café  ");
            string decomposed = AuthRateLimitIdentity.NormalizeUsername("cafe\u0301");

            Assert.Equal(composed, decomposed);
            Assert.Equal(
                AuthRateLimitIdentity.CreateKey("user", composed),
                AuthRateLimitIdentity.CreateKey("user", decomposed));
        }

        [Fact]
        public void PersistedIdentityKeysDoNotContainRawUsernameOrAddress()
        {
            string username = "Private-Example-User";
            string key = AuthRateLimitIdentity.CreateKey("user", AuthRateLimitIdentity.NormalizeUsername(username));

            Assert.StartsWith("user:", key);
            Assert.DoesNotContain(username, key, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(69, key.Length);
        }

        [Fact]
        public void ForwardedHeadersAreDisabledUnlessAnAllowlistIsConfigured()
        {
            var services = new ServiceCollection();
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:Enabled"] = "false",
                ["ForwardedHeaders:ForwardLimit"] = "1"
            }).Build();

            ForwardedHeadersConfiguration.AddServices(services, configuration);
            using var provider = services.BuildServiceProvider();
            var options = provider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

            Assert.Equal(ForwardedHeaders.None, options.ForwardedHeaders);
            Assert.Empty(options.KnownProxies);
            Assert.Empty(options.KnownIPNetworks);
        }

        [Fact]
        public void ForwardedHeadersRequireExplicitTrustedProxyAndBoundedHopCount()
        {
            var services = new ServiceCollection();
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:Enabled"] = "true",
                ["ForwardedHeaders:ForwardLimit"] = "2",
                ["ForwardedHeaders:KnownProxies:0"] = "10.1.2.3",
                ["ForwardedHeaders:KnownNetworks:0"] = "10.2.0.0/16"
            }).Build();

            ForwardedHeadersConfiguration.AddServices(services, configuration);
            using var provider = services.BuildServiceProvider();
            var options = provider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

            Assert.Equal(2, options.ForwardLimit);
            Assert.Equal(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, options.ForwardedHeaders);
            Assert.Contains(IPAddress.Parse("10.1.2.3"), options.KnownProxies);
            Assert.Single(options.KnownIPNetworks);
        }

        [Fact]
        public void ForwardedHeadersCannotBeEnabledWithoutTrustedSources()
        {
            var services = new ServiceCollection();
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:Enabled"] = "true",
                ["ForwardedHeaders:ForwardLimit"] = "1"
            }).Build();

            Assert.Throws<InvalidOperationException>(() =>
                ForwardedHeadersConfiguration.AddServices(services, configuration));
        }

        [Fact]
        public async Task UntrustedForwardedForHeaderCannotChooseTheRateLimitIdentity()
        {
            var configuration = CreateForwardedHeadersConfiguration(enabled: true, proxy: "10.1.2.3");
            var options = BuildForwardedHeadersOptions(configuration);
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.20");
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.99";

            var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
            await middleware.Invoke(context);

            Assert.Equal(IPAddress.Parse("203.0.113.20"), context.Connection.RemoteIpAddress);
        }

        [Fact]
        public async Task ConfiguredProxyCanProvideForwardedClientIdentity()
        {
            var configuration = CreateForwardedHeadersConfiguration(enabled: true, proxy: "10.1.2.3");
            var options = BuildForwardedHeadersOptions(configuration);
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = IPAddress.Parse("10.1.2.3");
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.99";
            context.Request.Headers["X-Forwarded-Proto"] = "https";

            var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
            await middleware.Invoke(context);

            Assert.Equal(IPAddress.Parse("198.51.100.99"), context.Connection.RemoteIpAddress);
            Assert.Equal("https", context.Request.Scheme);
        }

        [Fact]
        public async Task RejectedLoginReturnsRetryAfterHeader()
        {
            var rateLimiter = new Mock<IAuthRateLimiter>();
            rateLimiter.Setup(limiter => limiter.CheckAsync(
                    "test-user",
                    It.IsAny<IPAddress?>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new AuthRateLimitDecision(false, 37));
            var environment = new Mock<IWebHostEnvironment>();
            environment.SetupGet(value => value.EnvironmentName).Returns(Environments.Development);
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AuthSettings:BcryptWorkFactor"] = "10"
            }).Build();
            var controller = new AuthController(
                Mock.Of<IAuthService>(),
                rateLimiter.Object,
                Mock.Of<IUserService>(),
                Mock.Of<IDbHelper>(),
                configuration,
                NullLogger<AuthController>.Instance,
                environment.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };

            var result = await controller.Login(new LoginRequest { Username = "test-user", Password = "password" });

            var status = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status429TooManyRequests, status.StatusCode);
            Assert.Equal("37", controller.Response.Headers["Retry-After"].ToString());
        }

        private static IConfiguration CreateForwardedHeadersConfiguration(bool enabled, string proxy) =>
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:Enabled"] = enabled.ToString(),
                ["ForwardedHeaders:ForwardLimit"] = "1",
                ["ForwardedHeaders:KnownProxies:0"] = proxy
            }).Build();

        private static ForwardedHeadersOptions BuildForwardedHeadersOptions(IConfiguration configuration)
        {
            var services = new ServiceCollection();
            ForwardedHeadersConfiguration.AddServices(services, configuration);
            using var provider = services.BuildServiceProvider();
            return provider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;
        }
    }
}
