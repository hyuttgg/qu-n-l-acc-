using System.Buffers;

namespace ExtremeCompression;

/// <summary>
/// Encodes raw byte streams into LZ token sequences (literals + back-reference pairs).
/// </summary>
public sealed class DictionaryEncoder
{
    private readonly MatchConfig _config;

    public DictionaryEncoder(MatchConfig config)
    {
        _config = config;
    }

    public int Encode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.IsEmpty) return 0;

        using var finder = new MatchFinder(_config);
        int totalWritten = 0;

        int pos = 0;
        int anchor = 0;
        int length = input.Length;

        while (pos + _config.MinMatchLength <= length)
        {
            Match match = finder.FindBestMatch(input, pos);

            if (match.IsValid)
            {
                if (_config.EnableLazyMatching && pos + 1 + _config.MinMatchLength <= length)
                {
                    Match nextMatch = finder.FindBestMatch(input, pos + 1);
                    if (nextMatch.IsValid && nextMatch.Length > match.Length + 1)
                    {
                        pos++;
                        match = nextMatch;
                    }
                }

                int literalLength = pos - anchor;
                totalWritten += EmitToken(output, input.Slice(anchor, literalLength), match);

                int matchEnd = pos + match.Length;
                int step = _config.SearchDepth > 16 ? 1 : 2;
                for (int p = pos + 1; p < matchEnd && p + 4 <= length; p += step)
                {
                    finder.InsertPosition(input, p);
                }

                pos = matchEnd;
                anchor = pos;
            }
            else
            {
                pos++;
            }
        }

        int remainingLiterals = length - anchor;
        if (remainingLiterals > 0 || totalWritten == 0)
        {
            totalWritten += EmitToken(output, input.Slice(anchor, remainingLiterals), Match.Empty);
        }

        return totalWritten;
    }

    private static int EmitToken(IBufferWriter<byte> writer, ReadOnlySpan<byte> literals, Match match)
    {
        int litLen = literals.Length;
        bool hasMatch = match.IsValid;
        bool largeDist = hasMatch && match.Distance > 0xFFFF;

        byte header = 0;
        if (hasMatch) header |= 0x80;
        if (largeDist) header |= 0x40;

        int headerLit = Math.Min(litLen, 62);
        if (litLen >= 62) headerLit = 62;
        header |= (byte)headerLit;

        Span<byte> span = writer.GetSpan(16 + litLen);
        int idx = 0;
        span[idx++] = header;

        if (litLen >= 62)
        {
            idx += WriteVarInt(span.Slice(idx), litLen - 62);
        }

        literals.CopyTo(span.Slice(idx));
        idx += litLen;

        if (hasMatch)
        {
            if (largeDist)
            {
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(idx), (uint)match.Distance);
                idx += 4;
            }
            else
            {
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(idx), (ushort)match.Distance);
                idx += 2;
            }

            if (match.Length < 255)
            {
                span[idx++] = (byte)match.Length;
            }
            else
            {
                span[idx++] = 255;
                idx += WriteVarInt(span.Slice(idx), match.Length - 255);
            }
        }

        writer.Advance(idx);
        return idx;
    }

    private static int WriteVarInt(Span<byte> destination, int value)
    {
        int idx = 0;
        while (value >= 0x80)
        {
            destination[idx++] = (byte)((value & 0x7F) | 0x80);
            value >>= 7;
        }
        destination[idx++] = (byte)(value & 0x7F);
        return idx;
    }
}
