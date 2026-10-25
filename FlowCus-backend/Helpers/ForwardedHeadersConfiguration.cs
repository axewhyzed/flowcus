using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

namespace FlowCus.Helpers
{
    public static class ForwardedHeadersConfiguration
    {
        public static void AddServices(IServiceCollection services, IConfiguration configuration)
        {
            bool enabled = configuration.GetValue<bool>("ForwardedHeaders:Enabled");
            int forwardLimit = configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 1;
            if (forwardLimit is < 1 or > 10)
                throw new InvalidOperationException("ForwardedHeaders:ForwardLimit must be between 1 and 10.");

            string[] proxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
            string[] networks = configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];
            if (enabled && proxies.Length + networks.Length == 0)
                throw new InvalidOperationException("Forwarded headers are enabled, but no trusted proxy or network is configured.");

            var parsedProxies = proxies.Select(ParseProxy).ToArray();
            var parsedNetworks = networks.Select(ParseNetwork).ToArray();

            services.Configure<ForwardedHeadersOptions>(options =>
            {
                // Clear framework loopback defaults as well: the deployment allowlist is
                // the sole source of forwarded identity trust.
                options.KnownProxies.Clear();
                options.KnownIPNetworks.Clear();
                options.ForwardLimit = forwardLimit;
                options.ForwardedHeaders = enabled
                    ? ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
                    : ForwardedHeaders.None;

                foreach (IPAddress proxy in parsedProxies) options.KnownProxies.Add(proxy);
                foreach (System.Net.IPNetwork network in parsedNetworks) options.KnownIPNetworks.Add(network);
            });
        }

        private static IPAddress ParseProxy(string value)
        {
            if (!IPAddress.TryParse(value, out var address))
                throw new InvalidOperationException($"Invalid trusted proxy IP address: {value}");
            return address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        }

        private static System.Net.IPNetwork ParseNetwork(string value)
        {
            if (!System.Net.IPNetwork.TryParse(value, out var network))
                throw new InvalidOperationException($"Invalid trusted proxy network CIDR: {value}");
            if (network.PrefixLength == 0)
                throw new InvalidOperationException("A catch-all proxy network cannot be trusted.");
            return network;
        }
    }
}
