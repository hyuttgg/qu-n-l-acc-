using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using OceanForge.BackendEngine.Models;

namespace OceanForge.BackendEngine.Services
{
    public sealed class DataQueue
    {
        private readonly Channel<LuaData> _channel;

        public DataQueue(int capacity = 10000)
        {
            _channel = Channel.CreateBounded<LuaData>(
                new BoundedChannelOptions(capacity)
                {
                    FullMode = BoundedChannelFullMode.DropOldest,
                    SingleReader = false,
                    SingleWriter = false
                });
        }

        public ValueTask WriteAsync(LuaData data, CancellationToken cancellationToken = default)
        {
            return _channel.Writer.WriteAsync(data, cancellationToken);
        }

        public IAsyncEnumerable<LuaData> ReadAllAsync(CancellationToken cancellationToken = default)
        {
            return _channel.Reader.ReadAllAsync(cancellationToken);
        }
    }
}
