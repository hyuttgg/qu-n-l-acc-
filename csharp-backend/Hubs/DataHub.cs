using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace OceanForge.BackendEngine.Hubs
{
    public sealed class DataHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[SignalR DataHub] Client connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public async Task Subscribe(string accountId)
        {
            if (!string.IsNullOrWhiteSpace(accountId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"account:{accountId}");
            }
        }

        public async Task Unsubscribe(string accountId)
        {
            if (!string.IsNullOrWhiteSpace(accountId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"account:{accountId}");
            }
        }
    }
}
