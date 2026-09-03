using System.Buffers;

namespace ExtremeCompression.Entropy;

/// <summary>
/// Supported entropy compression algorithms.
/// </summary>
public enum EntropyCodecType : byte
{
    Raw = 0,
    Huffman = 1,
    Range = 2,
    Ans = 3
}

/// <summary>
/// Interface for entropy encoders and decoders.
/// </summary>
public interface IEntropyCodec
{
    EntropyCodecType Type { get; }

    /// <summary>
    /// Encodes input bytes into compressed entropy bitstream.
    /// </summary>
    void Encode(ReadOnlySpan<byte> input, IBufferWriter<byte> output);

    /// <summary>
    /// Decodes compressed entropy bitstream back into original bytes.
    /// </summary>
    void Decode(ReadOnlySpan<byte> input, IBufferWriter<byte> output);
}
