using Microsoft.AspNetCore.Mvc;
using OceanForge.BackendEngine.Models;
using OceanForge.BackendEngine.Services;
using System.Threading;
using System.Threading.Tasks;

namespace OceanForge.BackendEngine.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class DataController : ControllerBase
    {
        private readonly DataQueue _queue;

        public DataController(DataQueue queue)
        {
            _queue = queue;
        }

        [HttpPost]
        public async Task<IActionResult> Receive([FromBody] LuaData data, CancellationToken cancellationToken)
        {
            if (data == null)
            {
                return BadRequest(new { success = false, message = "Invalid data payload." });
            }

            await _queue.WriteAsync(data, cancellationToken);
            return Accepted(new { success = true, queued = true });
        }
    }
}
