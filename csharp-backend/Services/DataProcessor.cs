using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using OceanForge.BackendEngine.Hubs;
using OceanForge.BackendEngine.Models;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace OceanForge.BackendEngine.Services
{
    public sealed class DataProcessor : BackgroundService
    {
        private readonly DataQueue _queue;
        private readonly IHubContext<DataHub> _hub;

        public DataProcessor(DataQueue queue, IHubContext<DataHub> hub)
        {
            _queue = queue;
            _hub = hub;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var item in _queue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    var processed = Process(item);
                    await _hub.Clients.All.SendAsync("dataReceived", processed, stoppingToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DataProcessor Error]: {ex.Message}");
                }
            }
        }

        private static ProcessedData Process(LuaData input)
        {
            return new ProcessedData
            {
                Source = input.Source,
                PlayerId = input.PlayerId,
                RobloxUsername = input.RobloxUsername,
                Timestamp = input.Timestamp,
                Data = input.Data,
                IsDeduplicated = false
            };
        }
    }
}
