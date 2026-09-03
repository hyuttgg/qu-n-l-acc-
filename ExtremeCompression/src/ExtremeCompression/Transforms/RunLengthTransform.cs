namespace ExtremeCompression.Transforms;

/// <summary>
/// Run-length encoding transform: collapses long stretches of repeated identical bytes.
/// Format: whenever 4 identical bytes occur, the 5th byte encodes extra repetitions (0-255).
/// </summary>
public sealed class RunLengthTransform : ITransformData
{
    public TransformType Type => TransformType.RunLength;

    public int Transform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;

        int src = 0;
        int dst = 0;
        int length = input.Length;

        while (src < length)
        {
            byte b = input[src];
            int run = 1;

            while (src + run < length && input[src + run] == b && run < 259)
            {
                run++;
            }

            if (run >= 4)
            {
                if (dst + 5 > output.Length)
                    throw new ArgumentException("Output buffer too small", nameof(output));

                output[dst++] = b;
                output[dst++] = b;
                output[dst++] = b;
                output[dst++] = b;
                output[dst++] = (byte)(run - 4);
                src += run;
            }
            else
            {
                if (dst + run > output.Length)
                    throw new ArgumentException("Output buffer too small", nameof(output));

                for (int i = 0; i < run; i++)
                {
                    output[dst++] = b;
                }
                src += run;
            }
        }

        return dst;
    }

    public int InverseTransform(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;

        int src = 0;
        int dst = 0;
        int length = input.Length;

        while (src < length)
        {
            if (src + 4 <= length &&
                input[src] == input[src + 1] &&
                input[src] == input[src + 2] &&
                input[src] == input[src + 3])
            {
                byte b = input[src];
                src += 4;

                if (src >= length)
                    throw new InvalidDataException("Truncated run-length stream");

                int extra = input[src++];
                int total = 4 + extra;

                if (dst + total > output.Length)
                    throw new ArgumentException("Output buffer too small", nameof(output));

                output.Slice(dst, total).Fill(b);
                dst += total;
            }
            else
            {
                if (dst >= output.Length)
                    throw new ArgumentException("Output buffer too small", nameof(output));

                output[dst++] = input[src++];
            }
        }

        return dst;
    }
}
