using Microsoft.AspNetCore.Mvc;
using OceanForge.BackendEngine.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OceanForge.BackendEngine.Controllers
{
    public class HeartbeatUpdateDto
    {
        public string RobloxUsername { get; set; } = string.Empty;
        public string Status { get; set; } = "idle";
        public string Location { get; set; } = "Unknown";
        public int Level { get; set; } = 1;
        public long Beli { get; set; } = 0;
    }

    [ApiController]
    [Route("api/presence")]
    public class PresenceController : ControllerBase
    {
        private readonly AccountPresenceTracker _tracker;

        public PresenceController(AccountPresenceTracker tracker)
        {
            _tracker = tracker;
        }

        /// <summary>
        /// ⚡ Record account heartbeat in RAM (< 0.001ms)
        /// </summary>
        [HttpPost("update")]
        public IActionResult UpdateHeartbeat([FromBody] HeartbeatUpdateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.RobloxUsername))
            {
                return BadRequest(new { success = false, message = "RobloxUsername is required." });
            }

            _tracker.RecordHeartbeat(dto.RobloxUsername, dto.Status, dto.Location, dto.Level, dto.Beli);
            return Ok(new { success = true, message = "Heartbeat recorded successfully in C# RAM" });
        }

        /// <summary>
        /// ⚡ Detect account presence status (ON / OFF) at ~0.002ms execution speed
        /// </summary>
        [HttpGet("status/{username}")]
        public IActionResult GetAccountStatus(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return BadRequest(new { success = false, message = "Username parameter is required." });
            }

            var result = _tracker.EvaluateAccountPresence(username);
            return Ok(new
            {
                success = true,
                robloxUsername = result.RobloxUsername,
                isOnline = result.IsOnline,
                presenceStatus = result.PresenceStatus, // "ON" or "OFF"
                gameActivityStatus = result.GameActivityStatus,
                latencyMicroseconds = $"{result.LatencyMilliseconds * 1000.0:F2} μs",
                latencyMilliseconds = $"{result.LatencyMilliseconds:F4} ms",
                lastSeenSecondsAgo = result.LastSeenSecondsAgo,
                level = result.Level,
                beli = result.Beli,
                location = result.Location,
                lastHeartbeatUnixMs = result.LastHeartbeatUnixMs
            });
        }

        /// <summary>
        /// ⚡ High-speed bulk evaluation of all accounts ON / OFF status
        /// </summary>
        [HttpGet("all")]
        public IActionResult GetAllStatus()
        {
            var results = _tracker.EvaluateAllPresence();
            var metrics = _tracker.GetPresenceMetrics();

            return Ok(new
            {
                success = true,
                count = results.Count,
                data = results,
                metrics = metrics
            });
        }

        /// <summary>
        /// Real-time metrics & speed diagnostics of C# Presence Engine
        /// </summary>
        [HttpGet("metrics")]
        public IActionResult GetMetrics()
        {
            return Ok(_tracker.GetPresenceMetrics());
        }
    }
}
