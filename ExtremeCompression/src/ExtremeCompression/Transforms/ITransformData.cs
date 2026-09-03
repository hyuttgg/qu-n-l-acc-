namespace ExtremeCompression.Transforms;

/// <summary>
/// Identifier for invertible pre-processing byte transformations.
/// </summary>
public enum TransformType : byte
{
    None = 0,
    Delta = 1,
    ByteShuffle2 = 2,
    ByteShuffle4 = 3,
    ByteShuffle8 = 4,
    RunLength = 5
}

/// <summary>
/// Invertible data transformation interface to expose underlying correlation in data.
/// </summary>
public interface ITransformData
{
    TransformType Type { get; }

    /// <summary>
    /// Transforms input data into output buffer to increase compressibility.
    /// Output buffer length must match input or be adequately sized.
    /// </summary>
    int Transform(ReadOnlySpan<byte> input, Span<byte> output);

    /// <summary>
    /// Exactly inverts the transformation back to original form.
    /// </summary>
    int InverseTransform(ReadOnlySpan<byte> input, Span<byte> output);
}
