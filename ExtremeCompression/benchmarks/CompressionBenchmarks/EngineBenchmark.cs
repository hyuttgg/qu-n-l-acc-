using System.IO.Compression;
using System.Text;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Order;
using ExtremeCompression;
using ExtremeCompression;

namespace CompressionBenchmarks;

[MemoryDiagnoser]
[Orderer(SummaryOrderPolicy.FastestToSlowest)]
[RankColumn]
public class EngineBenchmark
{
    private byte[] _testData = Array.Empty<byte>();

    [Params("TextJson", "Repetitive", "Binary")]
    public string Dataset { get; set; } = "TextJson";

    [GlobalSetup]
    public void Setup()
    {
        switch (Dataset)
        {
            case "TextJson":
                var sb = new StringBuilder();
                for (int i = 0; i < 5000; i++)
                {
                    sb.AppendLine($$"""{"id": {{i}}, "user": "user_{{i % 50}}", "role": "admin", "event": "login", "timestamp": "2026-09-03T12:00:00Z", "payload": "sample_data_{{i}}"}""");
                }
                _testData = Encoding.UTF8.GetBytes(sb.ToString());
                break;

            case "Repetitive":
                _testData = new byte[1024 * 1024];
                for (int i = 0; i < _testData.Length; i++)
                {
                    _testData[i] = (byte)((i % 32) + 65);
                }
                break;

            case "Binary":
                _testData = new byte[1024 * 1024];
                new Random(42).NextBytes(_testData);
                break;
        }
    }

    [Benchmark(Baseline = true, Description = "GZip (Optimal)")]
    public byte[] Benchmark_GZip()
    {
        using var outMs = new MemoryStream();
        using (var gzip = new GZipStream(outMs, System.IO.Compression.CompressionLevel.Optimal, leaveOpen: true))
        {
            gzip.Write(_testData, 0, _testData.Length);
        }
        return outMs.ToArray();
    }

    [Benchmark(Description = "Brotli (Optimal)")]
    public byte[] Benchmark_Brotli()
    {
        using var outMs = new MemoryStream();
        using (var brotli = new BrotliStream(outMs, System.IO.Compression.CompressionLevel.Optimal, leaveOpen: true))
        {
            brotli.Write(_testData, 0, _testData.Length);
        }
        return outMs.ToArray();
    }

    [Benchmark(Description = "Deflate (Optimal)")]
    public byte[] Benchmark_Deflate()
    {
        using var outMs = new MemoryStream();
        using (var deflate = new DeflateStream(outMs, System.IO.Compression.CompressionLevel.Optimal, leaveOpen: true))
        {
            deflate.Write(_testData, 0, _testData.Length);
        }
        return outMs.ToArray();
    }

    [Benchmark(Description = "KXCP (UltraFast)")]
    public byte[] Benchmark_KXCP_UltraFast()
    {
        return Compressor.Compress(_testData, new CompressionOptions
        {
            Level = CompressionLevel.UltraFast,
            ChunkSize = 256 * 1024,
            Parallel = false
        });
    }

    [Benchmark(Description = "KXCP (Balanced)")]
    public byte[] Benchmark_KXCP_Balanced()
    {
        return Compressor.Compress(_testData, new CompressionOptions
        {
            Level = CompressionLevel.Balanced,
            ChunkSize = 512 * 1024,
            Parallel = false
        });
    }

    [Benchmark(Description = "KXCP (Extreme)")]
    public byte[] Benchmark_KXCP_Extreme()
    {
        return Compressor.Compress(_testData, new CompressionOptions
        {
            Level = CompressionLevel.Extreme,
            ChunkSize = 1024 * 1024,
            Parallel = false
        });
    }
}
