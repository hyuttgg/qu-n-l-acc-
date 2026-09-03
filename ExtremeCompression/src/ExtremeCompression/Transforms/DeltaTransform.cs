using ExtremeCompression.SIMD;

namespace ExtremeCompression.Transforms;

/// <summary>
/// Delta differencing transform: replaces absolute values with difference from predecessor.
/// Highly effective for monotonic counters, sorted IDs, and time-series data.
/// </summary>
public sealed class DeltaTransform : ITransformData
{
    public TransformType Type => TransformType.Delta;

    public int Transform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;
        if (output.Length < input.Length)
            throw new ArgumentException("Output buffer too small", nameof(output));

        SimdOperations.DeltaEncode(input, output.Slice(0, input.Length));
        return input.Length;
    }

    public int InverseTransform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;
        if (output.Length < input.Length)
            throw new ArgumentException("Output buffer too small", nameof(output));

        SimdOperations.DeltaDecode(input, output.Slice(0, input.Length));
        return input.Length;
    }
}
