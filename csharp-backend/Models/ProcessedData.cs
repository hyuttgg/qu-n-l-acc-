namespace OceanForge.BackendEngine.Models
{
    public sealed class ProcessedData
    {
        public string Source { get; set; } = "";
        public string PlayerId { get; set; } = "";
        public string RobloxUsername { get; set; } = "";
        public long Timestamp { get; set; }
        public object? Data { get; set; }
        public bool IsDeduplicated { get; set; }
    }
}
