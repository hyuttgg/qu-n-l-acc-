using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace OceanForge.BackendEngine.Infrastructure
{
    public sealed record AccountJob(
        string AccountId,
        string JobType, // "heartbeat", "sync", "snapshot", "telemetry"
        object? Payload = null
    );

    public sealed record QueueStats(
        int QueueLength,
        int ActiveWorkers,
        long CompletedJobs,
        long FailedJobs,
        int WorkerCapacity
    );

    public interface IHeavyLoadManager
    {
        ValueTask EnqueueAsync(AccountJob job, CancellationToken cancellationToken = default);
        QueueStats GetStats();
        Task RunWorkerAsync(Func<AccountJob, CancellationToken, Task> processor, CancellationToken cancellationToken);
    }

    /// <summary>
    /// ⚡ Enterprise-Grade Heavy Load Engine with Bounded Channels & Fixed Worker Pool
    /// Prevents unbounded Task.Run allocations across thousands of concurrent accounts.
    /// Includes debounce throttling (100ms) per account to eliminate duplicate spike traffic.
    /// </summary>
    public sealed class HeavyLoadManager : IHeavyLoadManager
    {
        private readonly Channel<AccountJob> _queue;
        private readonly SemaphoreSlim _workersLimiter;
        private readonly int _workerCount;

        private long _completedJobs;
        private long _failedJobs;
        private int _activeWorkers;

        private readonly ConcurrentDictionary<string, DateTime> _lastExecution = new(StringComparer.OrdinalIgnoreCase);

        public HeavyLoadManager(int? workerCount = null, int queueCapacity = 20000)
        {
            // Auto-calculate optimal worker pool based on CPU cores: clamp(cpu * 4, 8, 128)
            int cpu = Environment.ProcessorCount;
            _workerCount = workerCount ?? Math.Clamp(cpu * 4, 8, 128);

            _queue = Channel.CreateBounded<AccountJob>(
                new BoundedChannelOptions(queueCapacity)
                {
                    FullMode = BoundedChannelFullMode.Wait,
                    SingleReader = false,
                    SingleWriter = false,
                    AllowSynchronousContinuations = false
                });

            _workersLimiter = new SemaphoreSlim(_workerCount, _workerCount);
        }

        public async ValueTask EnqueueAsync(AccountJob job, CancellationToken cancellationToken = default)
        {
            await _queue.Writer.WriteAsync(job, cancellationToken);
        }

        public async Task RunWorkerAsync(Func<AccountJob, CancellationToken, Task> processor, CancellationToken cancellationToken)
        {
            await foreach (var job in _queue.Reader.ReadAllAsync(cancellationToken))
            {
                await _workersLimiter.WaitAsync(cancellationToken);
                Interlocked.Increment(ref _activeWorkers);

                _ = ProcessInternalAsync(job, processor, cancellationToken);
            }
        }

        private async Task ProcessInternalAsync(AccountJob job, Func<AccountJob, CancellationToken, Task> processor, CancellationToken cancellationToken)
        {
            try
            {
                // Anti-spam debounce per account (< 100ms interval)
                if (!string.IsNullOrEmpty(job.AccountId) && _lastExecution.TryGetValue(job.AccountId, out var lastRun))
                {
                    var elapsed = DateTime.UtcNow - lastRun;
                    if (elapsed.TotalMilliseconds < 100)
                    {
                        await Task.Delay(TimeSpan.FromMilliseconds(100) - elapsed, cancellationToken);
                    }
                }

                if (!string.IsNullOrEmpty(job.AccountId))
                {
                    _lastExecution[job.AccountId] = DateTime.UtcNow;
                }

                await processor(job, cancellationToken);
                Interlocked.Increment(ref _completedJobs);
            }
            catch
            {
                Interlocked.Increment(ref _failedJobs);
            }
            finally
            {
                Interlocked.Decrement(ref _activeWorkers);
                _workersLimiter.Release();
            }
        }

        public QueueStats GetStats()
        {
            return new QueueStats(
                QueueLength: _queue.Reader.Count,
                ActiveWorkers: _activeWorkers,
                CompletedJobs: Interlocked.Read(ref _completedJobs),
                FailedJobs: Interlocked.Read(ref _failedJobs),
                WorkerCapacity: _workerCount
            );
        }
    }
}
