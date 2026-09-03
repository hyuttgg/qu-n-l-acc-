using ExtremeCompression;

namespace ExtremeCompression.Entropy;

/// <summary>
/// Registry and selector for entropy compression algorithms.
/// </summary>
public static class EntropyCodecSelector
{
    private static readonly HuffmanCodec Huffman = new();
    private static readonly RangeCodec Range = new();
    private static readonly AnsCodec Ans = new();

    public static IEntropyCodec? GetCodec(EntropyCodecType type)
    {
        return type switch
        {
            EntropyCodecType.Huffman => Huffman,
            EntropyCodecType.Range => Range,
            EntropyCodecType.Ans => Ans,
            _ => null
        };
    }

    /// <summary>
    /// Chooses the optimal entropy codec based on compression level and input size.
    /// </summary>
    public static EntropyCodecType ChooseOptimalCodec(CompressionLevel level, int byteLength)
    {
        // Don't use entropy overhead for very small blocks (< 128 bytes)
        if (byteLength < 128)
            return EntropyCodecType.Raw;

        return level switch
        {
            CompressionLevel.UltraFast => EntropyCodecType.Raw,
            CompressionLevel.Fast => EntropyCodecType.Huffman,
            CompressionLevel.Balanced => EntropyCodecType.Ans,
            CompressionLevel.High => EntropyCodecType.Ans,
            CompressionLevel.Extreme => EntropyCodecType.Range,
            CompressionLevel.Maximum => EntropyCodecType.Range,
            _ => EntropyCodecType.Huffman
        };
    }
}
