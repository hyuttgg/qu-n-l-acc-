using System.Buffers;

namespace ExtremeCompression.Matching;

/// <summary>
/// Reconstructs original data from LZ tokens (literals and back-reference matches).
/// Highly optimized for zero-copy streaming into pre-allocated spans or IBufferWriter.
/// </summary>
public static class DictionaryDecoder
{
    /// <summary>
    /// Decodes LZ token stream directly into the destination span.
    /// </summary>
    public static int Decode(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return 0;

        int src = 0;
        int dst = 0;
        int inputLength = input.Length;

        while (src < inputLength)
        {
            byte header = input[src++];
            bool hasMatch = (header & 0x80) != 0;
            bool largeDist = (header & 0x40) != 0;
            int litLen = header & 0x3F;

            if (litLen == 62)
            {
                litLen = 62 + ReadVarInt(input, ref src);
            }

            if (litLen > 0)
            {
                if (src + litLen > inputLength || dst + litLen > output.Length)
                    throw new InvalidDataException("Literal length exceeds buffer boundaries");

                input.Slice(src, litLen).CopyTo(output.Slice(dst));
                src += litLen;
                dst += litLen;
            }

            if (hasMatch)
            {
                int dist;
                if (largeDist)
                {
                    if (src + 4 > inputLength)
                        throw new InvalidDataException("Unexpected end of stream while reading distance");
                    dist = (int)System.Runtime.InteropServices.MemoryMarshal.Read<uint>(input.Slice(src));
                    src += 4;
                }
                else
                {
                    if (src + 2 > inputLength)
                        throw new InvalidDataException("Unexpected end of stream while reading distance");
                    dist = System.Runtime.InteropServices.MemoryMarshal.Read<ushort>(input.Slice(src));
                    src += 2;
                }

                if (src >= inputLength)
                    throw new InvalidDataException("Unexpected end of stream while reading match length");

                int matchLen = input[src++];
                if (matchLen == 255)
                {
                    matchLen = 255 + ReadVarInt(input, ref src);
                }

                if (dist <= 0 || dist > dst)
                    throw new InvalidDataException($"Invalid backward distance: {dist}, current position: {dst}");

                if (dst + matchLen > output.Length)
                    throw new InvalidDataException("Match length exceeds output buffer bounds");

                int matchSrc = dst - dist;

                // Fast path: non-overlapping match can use fast copy
                if (dist >= matchLen)
                {
                    output.Slice(matchSrc, matchLen).CopyTo(output.Slice(dst));
                }
                else
                {
                    // Overlapping match (e.g. run-length repetition)
                    for (int i = 0; i < matchLen; i++)
                    {
                        output[dst + i] = output[matchSrc + i];
                    }
                }

                dst += matchLen;
            }
        }

        return dst;
    }

    /// <summary>
    /// Decodes LZ token stream into an IBufferWriter.
    /// </summary>
    public static void Decode(ReadOnlySpan<byte> input, IBufferWriter<byte> output, int expectedLength)
    {
        Span<byte> span = output.GetSpan(expectedLength);
        int written = Decode(input, span.Slice(0, expectedLength));
        output.Advance(written);
    }

    private static int ReadVarInt(ReadOnlySpan<byte> span, ref int pos)
    {
        int result = 0;
        int shift = 0;

        while (pos < span.Length)
        {
            byte b = span[pos++];
            result |= (b & 0x7F) << shift;
            if ((b & 0x80) == 0)
                return result;

            shift += 7;
            if (shift > 28)
                throw new InvalidDataException("Malformed VarInt in LZ stream");
        }

        throw new InvalidDataException("Truncated VarInt in LZ stream");
    }
}
