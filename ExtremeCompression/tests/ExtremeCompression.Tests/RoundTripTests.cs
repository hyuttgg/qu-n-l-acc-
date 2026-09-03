using System.Text;
using ExtremeCompression;
using Xunit;

namespace ExtremeCompression.Tests;

public class RoundTripTests
{
    [Fact]
    public void CompressAndDecompress_EmptyData_ReturnsEmpty()
    {
        byte[] original = Array.Empty<byte>();
        byte[] compressed = Compressor.Compress(original);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Empty(decompressed);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(15)]
    [InlineData(64)]
    [InlineData(255)]
    public void CompressAndDecompress_SmallData_MatchesOriginal(int size)
    {
        byte[] original = new byte[size];
        for (int i = 0; i < size; i++) original[i] = (byte)(i * 7 + 3);

        byte[] compressed = Compressor.Compress(original);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
    }

    [Fact]
    public void CompressAndDecompress_HighlyRepetitiveData_HighRatioAndLossless()
    {
        byte[] original = new byte[64 * 1024];
        Array.Fill(original, (byte)'A');

        byte[] compressed = Compressor.Compress(original);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
        Assert.True(compressed.Length < original.Length / 10, $"Compressed size {compressed.Length} should be much smaller than original {original.Length}");
    }

    [Fact]
    public void CompressAndDecompress_PureRandomData_DoesNotExpandAndLossless()
    {
        byte[] original = new byte[32 * 1024];
        new Random(42).NextBytes(original);

        byte[] compressed = Compressor.Compress(original);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
        // Should trigger RAW fallback so compressed size is roughly original + headers (minimal overhead)
        Assert.True(compressed.Length <= original.Length + 1024);
    }

    [Fact]
    public void CompressAndDecompress_JsonText_MatchesOriginal()
    {
        string json = """
        {
            "service": "OceanForge Backend Engine",
            "version": "2.4.0",
            "status": "healthy",
            "metrics": {
                "cpu_usage": 14.5,
                "memory_mb": 512,
                "active_connections": 128
            },
            "nodes": [
                {"id": 1, "name": "node-alpha", "ip": "192.168.1.10"},
                {"id": 2, "name": "node-beta", "ip": "192.168.1.11"},
                {"id": 3, "name": "node-gamma", "ip": "192.168.1.12"}
            ]
        }
        """;
        // Repeat to make realistic block
        var sb = new StringBuilder();
        for (int i = 0; i < 200; i++) sb.AppendLine(json);
        byte[] original = Encoding.UTF8.GetBytes(sb.ToString());

        byte[] compressed = Compressor.Compress(original, new CompressionOptions { Level = CompressionLevel.High });
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
        Assert.True(compressed.Length < original.Length / 3);
    }

    [Fact]
    public void CompressAndDecompress_UnicodeUtf8_MatchesOriginal()
    {
        string text = "Chào mừng bạn đến với C# Extreme Compression Engine — Nén dữ liệu lossless siêu tốc độ! 🚀🔥 Đảm bảo 100% toàn vẹn dữ liệu.";
        var sb = new StringBuilder();
        for (int i = 0; i < 100; i++) sb.AppendLine(text);
        byte[] original = Encoding.UTF8.GetBytes(sb.ToString());

        byte[] compressed = Compressor.Compress(original);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
    }

    [Theory]
    [InlineData(CompressionLevel.UltraFast)]
    [InlineData(CompressionLevel.Fast)]
    [InlineData(CompressionLevel.Balanced)]
    [InlineData(CompressionLevel.High)]
    [InlineData(CompressionLevel.Extreme)]
    [InlineData(CompressionLevel.Maximum)]
    public void CompressAndDecompress_AllLevels_ProduceIdenticalOutput(CompressionLevel level)
    {
        byte[] original = Encoding.UTF8.GetBytes(string.Join("\n", Enumerable.Range(0, 1000).Select(i => $"Log entry {i}: status=OK, latency={i % 50}ms, user=user_{i % 20}")));

        var options = new CompressionOptions { Level = level, ChunkSize = 64 * 1024 };
        byte[] compressed = Compressor.Compress(original, options);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
    }

    [Fact]
    public void CompressAndDecompress_MultiChunkLargeData_ParallelAndLossless()
    {
        // 2 MB dataset spanning multiple 256KB chunks
        byte[] original = new byte[2 * 1024 * 1024];
        for (int i = 0; i < original.Length; i++)
        {
            original[i] = (byte)((i ^ (i >> 8)) & 0xFF);
        }

        var options = new CompressionOptions
        {
            ChunkSize = 256 * 1024,
            Parallel = true,
            MaxDegreeOfParallelism = 4,
            Level = CompressionLevel.Balanced
        };

        byte[] compressed = Compressor.Compress(original, options);
        byte[] decompressed = Compressor.Decompress(compressed);

        Assert.Equal(original, decompressed);
    }
}
