using BenchmarkDotNet.Running;

namespace CompressionBenchmarks;

public static class Program
{
    public static void Main(string[] args)
    {
        Console.WriteLine("========================================================================");
        Console.WriteLine(" C# EXTREME COMPRESSION ENGINE (KXCP) — PERFORMANCE & RATIO BENCHMARKS ");
        Console.WriteLine("========================================================================");

        if (args.Length > 0 && args[0].Equals("--quick", StringComparison.OrdinalIgnoreCase))
        {
            RunQuickDemo();
            return;
        }

        BenchmarkRunner.Run<EngineBenchmark>();
    }

    private static void RunQuickDemo()
    {
        Console.WriteLine("Executing Quick Verification Benchmark...");
        var bench = new EngineBenchmark { Dataset = "TextJson" };
        bench.Setup();

        var gzipOut = bench.Benchmark_GZip();
        var brotliOut = bench.Benchmark_Brotli();
        var kxcpUltra = bench.Benchmark_KXCP_UltraFast();
        var kxcpBal = bench.Benchmark_KXCP_Balanced();
        var kxcpExt = bench.Benchmark_KXCP_Extreme();

        Console.WriteLine($"Original Size:       1,000,000+ bytes");
        Console.WriteLine($"GZip Compressed:     {gzipOut.Length:N0} bytes");
        Console.WriteLine($"Brotli Compressed:   {brotliOut.Length:N0} bytes");
        Console.WriteLine($"KXCP (UltraFast):    {kxcpUltra.Length:N0} bytes");
        Console.WriteLine($"KXCP (Balanced):     {kxcpBal.Length:N0} bytes");
        Console.WriteLine($"KXCP (Extreme):      {kxcpExt.Length:N0} bytes");
        Console.WriteLine("Quick verification complete.");
    }
}
