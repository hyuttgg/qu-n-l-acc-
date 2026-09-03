using System.Runtime.InteropServices;

namespace ExtremeCompression;

/// <summary>
/// Classified data category based on byte profiling heuristics.
/// </summary>
public enum DataType : byte
{
    Unknown = 0,
    Text = 1,
    Json = 2,
    Xml = 3,
    Csv = 4,
    Binary = 5,
    Image = 6,
    Log = 7,
    Executable = 8,
    Database = 9
}

/// <summary>
/// Profiling result of an input buffer describing entropy, uniqueness, and structural tendencies.
/// </summary>
public sealed class DataProfile
{
    public long Length { get; init; }
    public double Entropy { get; init; }
    public int UniqueBytes { get; init; }
    public double RepetitionScore { get; init; }
    public double SequentialScore { get; init; }
    public DataType Type { get; init; }

    public override string ToString() =>
        $"Profile: Type={Type}, Length={Length}, Entropy={Entropy:F2} b/s, Unique={UniqueBytes}/256, Repetition={RepetitionScore:P1}, Sequential={SequentialScore:P1}";
}

/// <summary>
/// Preset compression levels balancing speed, memory, and compression ratio.
/// </summary>
public enum CompressionLevel
{
    UltraFast = 0,
    Fast = 1,
    Balanced = 2,
    High = 3,
    Extreme = 4,
    Maximum = 5
}

/// <summary>
/// Backward reference match in the sliding dictionary window.
/// </summary>
[StructLayout(LayoutKind.Sequential, Pack = 4)]
public readonly struct Match
{
    public int Distance { get; init; }
    public int Length { get; init; }

    public Match(int distance, int length)
    {
        Distance = distance;
        Length = length;
    }

    public static Match Empty => default;
    public bool IsValid => Length > 0 && Distance > 0;
    public override string ToString() => $"Match(Dist={Distance}, Len={Length})";
}

/// <summary>
/// Configuration for the LZ-style match finder.
/// </summary>
public sealed class MatchConfig
{
    public int WindowSize { get; init; } = 64 * 1024;
    public int MinMatchLength { get; init; } = 4;
    public int MaxMatchLength { get; init; } = 65535;
    public int SearchDepth { get; init; } = 16;
    public bool EnableLazyMatching { get; init; } = false;
    public int HashBuckets { get; init; } = 65536;

    public static MatchConfig ForLevel(CompressionLevel level, int maxBlockSize = 1024 * 1024)
    {
        return level switch
        {
            CompressionLevel.UltraFast => new MatchConfig
            {
                WindowSize = Math.Min(64 * 1024, maxBlockSize),
                MinMatchLength = 4,
                MaxMatchLength = 1024,
                SearchDepth = 4,
                EnableLazyMatching = false,
                HashBuckets = 32768
            },
            CompressionLevel.Fast => new MatchConfig
            {
                WindowSize = Math.Min(128 * 1024, maxBlockSize),
                MinMatchLength = 4,
                MaxMatchLength = 2048,
                SearchDepth = 8,
                EnableLazyMatching = false,
                HashBuckets = 65536
            },
            CompressionLevel.Balanced => new MatchConfig
            {
                WindowSize = Math.Min(512 * 1024, maxBlockSize),
                MinMatchLength = 3,
                MaxMatchLength = 8192,
                SearchDepth = 16,
                EnableLazyMatching = true,
                HashBuckets = 65536
            },
            CompressionLevel.High => new MatchConfig
            {
                WindowSize = Math.Min(1024 * 1024, maxBlockSize),
                MinMatchLength = 3,
                MaxMatchLength = 16384,
                SearchDepth = 32,
                EnableLazyMatching = true,
                HashBuckets = 131072
            },
            CompressionLevel.Extreme => new MatchConfig
            {
                WindowSize = Math.Min(2048 * 1024, maxBlockSize),
                MinMatchLength = 3,
                MaxMatchLength = 32768,
                SearchDepth = 64,
                EnableLazyMatching = true,
                HashBuckets = 262144
            },
            CompressionLevel.Maximum => new MatchConfig
            {
                WindowSize = Math.Min(4096 * 1024, maxBlockSize),
                MinMatchLength = 3,
                MaxMatchLength = 65535,
                SearchDepth = 128,
                EnableLazyMatching = true,
                HashBuckets = 262144
            },
            _ => new MatchConfig()
        };
    }
}

/// <summary>
/// Checksum algorithm selection.
/// </summary>
public enum ChecksumType : byte
{
    None = 0,
    Crc32c = 1,
    Fast64 = 2
}

/// <summary>
/// Compression options passed to Compressor and CompressionEngine.
/// </summary>
public sealed class CompressionOptions
{
    public CompressionLevel Level { get; init; } = CompressionLevel.Balanced;
    public int ChunkSize { get; init; } = 1024 * 1024;
    public bool Parallel { get; init; } = true;
    public int MaxDegreeOfParallelism { get; init; } = Environment.ProcessorCount;
    public ChecksumType Checksum { get; init; } = ChecksumType.Crc32c;
    public bool EnableSIMD { get; init; } = true;
    public bool EnableTransforms { get; init; } = true;
    public bool EnableEntropyCoding { get; init; } = true;
    public int BufferSize { get; init; } = 64 * 1024;

    public static CompressionOptions Default => new();
    public static CompressionOptions FastPreset => new() { Level = CompressionLevel.Fast, ChunkSize = 256 * 1024 };
    public static CompressionOptions ExtremePreset => new() { Level = CompressionLevel.Extreme, ChunkSize = 2 * 1024 * 1024 };
}

/// <summary>
/// Decision record from automated analysis.
/// </summary>
public sealed class CompressionDecision
{
    public CompressionLevel Level { get; init; }
    public int ChunkSize { get; init; }
    public int DictionarySize { get; init; }
    public double EstimatedRatio { get; init; }
    public double EstimatedSpeedMbPerSec { get; init; }
    public string RecommendedPipeline { get; init; } = string.Empty;

    public override string ToString() =>
        $"Decision: Pipeline={RecommendedPipeline}, Level={Level}, Chunk={ChunkSize / 1024}KB, EstRatio={EstimatedRatio:P1}, EstSpeed={EstimatedSpeedMbPerSec:F1} MB/s";
}
