using System;
using System.Collections.Generic;

namespace OceanForge.BackendEngine.Models
{
    public sealed class LuaData
    {
        public string Source { get; set; } = "lua-client";
        public string PlayerId { get; set; } = "";
        public string RobloxUsername { get; set; } = "";
        public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        public Dictionary<string, object>? Data { get; set; }
    }
}
