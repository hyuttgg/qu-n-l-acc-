namespace ExtremeCompression.Transforms;

/// <summary>
/// Byte shuffle (transposition) transform: clusters identical byte-significance positions
/// across fixed-width structures (e.g. 16-bit, 32-bit, or 64-bit numerical arrays).
/// </summary>
public sealed class ByteShuffleTransform : ITransformData
{
    public int Stride { get; }
    public TransformType Type { get; }

    public ByteShuffleTransform(int stride)
    {
        if (stride is not (2 or 4 or 8))
            throw new ArgumentOutOfRangeException(nameof(stride), "Stride must be 2, 4, or 8");

        Stride = stride;
        Type = stride switch
        {
            2 => TransformType.ByteShuffle2,
            4 => TransformType.ByteShuffle4,
            8 => TransformType.ByteShuffle8,
            _ => TransformType.None
        };
    }

    public int Transform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;
        if (output.Length < input.Length)
            throw new ArgumentException("Output buffer too small", nameof(output));

        int n = input.Length / Stride;
        int alignedLength = n * Stride;

        for (int c = 0; c < Stride; c++)
        {
            int destOffset = c * n;
            for (int i = 0; i < n; i++)
            {
                output[destOffset + i] = input[i * Stride + c];
            }
        }

        // Copy trailing bytes unmodified
        if (alignedLength < input.Length)
        {
            input.Slice(alignedLength).CopyTo(output.Slice(alignedLength));
        }

        return input.Length;
    }

    public int InverseTransform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;
        if (output.Length < input.Length)
            throw new ArgumentException("Output buffer too small", nameof(output));

        int n = input.Length / Stride;
        int alignedLength = n * Stride;

        for (int c = 0; c < Stride; c++)
        {
            int srcOffset = c * n;
            for (int i = 0; i < n; i++)
            {
                output[i * Stride + c] = input[srcOffset + i];
            }
        }

        // Copy trailing bytes unmodified
        if (alignedLength < input.Length)
        {
            input.Slice(alignedLength).CopyTo(output.Slice(alignedLength));
        }

        return input.Length;
    }
}
