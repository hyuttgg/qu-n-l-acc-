namespace ExtremeCompression;

/// <summary>
/// Interface for partitioning data into blocks for dictionary and entropy processing.
/// </summary>
public interface IChunker
{
    /// <summary>
    /// Splits an input buffer into a sequence of contiguous block slices.
    /// </summary>
    IEnumerable<ReadOnlyMemory<byte>> Split(ReadOnlyMemory<byte> input);
}

/// <summary>
/// Adaptive chunker splitting buffers based on memory limits, compression level, and data profiles.
/// Supported block boundaries: 64 KB, 256 KB, 1 MB, 4 MB.
/// </summary>
public sealed class AdaptiveChunker : IChunker
{
    public const int Chunk64KB = 64 * 1024;
    public const int Chunk256KB = 256 * 1024;
    public const int Chunk1MB = 1024 * 1024;
    public const int Chunk4MB = 4 * 1024 * 1024;

    public int TargetChunkSize { get; }

    public AdaptiveChunker(int targetChunkSize = Chunk1MB)
    {
        TargetChunkSize = NormalizeChunkSize(targetChunkSize);
    }

    public static int SelectOptimalChunkSize(long totalLength, CompressionLevel level, DataProfile? profile = null)
    {
        if (totalLength <= Chunk64KB) return Chunk64KB;
        if (totalLength <= Chunk256KB * 2) return Chunk256KB;

        if (level <= CompressionLevel.Fast)
            return totalLength > Chunk1MB ? Chunk256KB : Chunk64KB;

        if (level >= CompressionLevel.High)
        {
            if (profile?.Type == DataType.Text || profile?.Type == DataType.Log || profile?.Type == DataType.Json)
                return totalLength >= Chunk4MB ? Chunk4MB : Chunk1MB;

            return totalLength >= Chunk1MB ? Chunk1MB : Chunk256KB;
        }

        return totalLength >= Chunk1MB ? Chunk1MB : Chunk256KB;
    }

    public static int NormalizeChunkSize(int size)
    {
        if (size <= Chunk64KB) return Chunk64KB;
        if (size <= Chunk256KB) return Chunk256KB;
        if (size <= Chunk1MB) return Chunk1MB;
        return Chunk4MB;
    }

    public IEnumerable<ReadOnlyMemory<byte>> Split(ReadOnlyMemory<byte> input)
    {
        if (input.IsEmpty) yield break;

        int remaining = input.Length;
        int offset = 0;

        while (remaining > 0)
        {
            int sliceSize = Math.Min(TargetChunkSize, remaining);
            yield return input.Slice(offset, sliceSize);
            offset += sliceSize;
            remaining -= sliceSize;
        }
    }
}
