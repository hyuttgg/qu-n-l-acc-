using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using OceanForge.BackendEngine.Infrastructure;

namespace OceanForge.BackendEngine.Controllers
{
    [ApiController]
    [Route("api/heavy-load")]
    public class HeavyLoadController : ControllerBase
    {
        private readonly IHeavyLoadManager _manager;

        public HeavyLoadController(IHeavyLoadManager manager)
        {
            _manager = manager;
        }

        [HttpPost("{accountId}/heartbeat")]
        public async Task<IActionResult> Heartbeat(string accountId, CancellationToken cancellationToken)
        {
            await _manager.EnqueueAsync(
                new AccountJob(accountId, "heartbeat"),
                cancellationToken
            );

            return Accepted(new
            {
                success = true,
                accountId,
                queued = true
            });
        }

        [HttpPost("{accountId}/sync")]
        public async Task<IActionResult> Sync(string accountId, [FromBody] object? payload, CancellationToken cancellationToken)
        {
            await _manager.EnqueueAsync(
                new AccountJob(accountId, "sync", payload),
                cancellationToken
            );

            return Accepted(new
            {
                success = true,
                accountId,
                queued = true
            });
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            return Ok(new
            {
                success = true,
                stats = _manager.GetStats()
            });
        }
    }
}
