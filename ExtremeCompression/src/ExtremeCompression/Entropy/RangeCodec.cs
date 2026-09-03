using System.Buffers;
using ExtremeCompression.SIMD;

namespace ExtremeCompression.Entropy;

/// <summary>
/// High-precision 32-bit Arithmetic Range Codec. Achieves fractional-bit entropy encoding.
/// </summary>
public sealed class RangeCodec : IEntropyCodec
{
    public EntropyCodecType Type => EntropyCodecType.Range;

    private const uint Top = 1U << 24;
    private const uint Bottom = 1U << 16;
    private const uint TotalFreq = 4096; // 12-bit precision

    public void Encode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.IsEmpty)
        {
            Span<byte> hdr = output.GetSpan(4);
            System.Runtime.InteropServices.MemoryMarshal.Write(hdr, 0);
            output.Advance(4);
            return;
        }

        // 1. Calculate and normalize frequencies to TotalFreq
        Span<int> rawFreq = stackalloc int[256];
        SimdOperations.ComputeByteHistogram(input, rawFreq);

        Span<uint> freq = stackalloc uint[256];
        Span<uint> cumFreq = stackalloc uint[257];
        NormalizeFrequencies(rawFreq, input.Length, freq, cumFreq);

        // 2. Write Header: Length (4 bytes) + Non-zero frequencies
        Span<byte> headerSpan = output.GetSpan(1024);
        int hIdx = 0;
        System.Runtime.InteropServices.MemoryMarshal.Write(headerSpan.Slice(hIdx), (uint)input.Length);
        hIdx += 4;

        for (int i = 0; i < 256; i++)
        {
            // 12-bit frequencies encoded as 2 bytes
            System.Runtime.InteropServices.MemoryMarshal.Write(headerSpan.Slice(hIdx), (ushort)freq[i]);
            hIdx += 2;
        }
        output.Advance(hIdx);

        // 3. Range Encode
        uint low = 0;
        uint range = 0xFFFFFFFFU;

        for (int i = 0; i < input.Length; i++)
        {
            byte sym = input[i];
            uint symLow = cumFreq[sym];
            uint symFreq = freq[sym];

            range /= TotalFreq;
            low += symLow * range;
            range *= symFreq;

            while ((low ^ (low + range)) < Top || (range < Bottom && ((range = (uint)-(int)low & (Bottom - 1)) != 0)))
            {
                Span<byte> outB = output.GetSpan(1);
                outB[0] = (byte)(low >> 24);
                output.Advance(1);
                low <<= 8;
                range <<= 8;
            }
        }

        // Flush remaining state
        for (int i = 0; i < 4; i++)
        {
            Span<byte> outB = output.GetSpan(1);
            outB[0] = (byte)(low >> 24);
            output.Advance(1);
            low <<= 8;
        }
    }

    public void Decode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.Length < 4 + 512)
            throw new InvalidDataException("Truncated Range stream header");

        int inIdx = 0;
        int originalLength = (int)System.Runtime.InteropServices.MemoryMarshal.Read<uint>(input.Slice(inIdx));
        inIdx += 4;

        if (originalLength == 0) return;

        Span<uint> freq = stackalloc uint[256];
        Span<uint> cumFreq = stackalloc uint[257];
        cumFreq[0] = 0;

        for (int i = 0; i < 256; i++)
        {
            freq[i] = System.Runtime.InteropServices.MemoryMarshal.Read<ushort>(input.Slice(inIdx));
            inIdx += 2;
            cumFreq[i + 1] = cumFreq[i] + freq[i];
        }

        uint code = 0;
        for (int i = 0; i < 4; i++)
        {
            code = (code << 8) | (inIdx < input.Length ? input[inIdx++] : 0);
        }

        uint low = 0;
        uint range = 0xFFFFFFFFU;

        Span<byte> outSpan = output.GetSpan(originalLength);

        for (int i = 0; i < originalLength; i++)
        {
            range /= TotalFreq;
            uint count = (code - low) / range;

            // Find symbol via binary search in cumFreq
            int sym = BinarySearchCumFreq(cumFreq, count);

            outSpan[i] = (byte)sym;

            uint symLow = cumFreq[sym];
            uint symFreq = freq[sym];

            low += symLow * range;
            range *= symFreq;

            while ((low ^ (low + range)) < Top || (range < Bottom && ((range = (uint)-(int)low & (Bottom - 1)) != 0)))
            {
                code = (code << 8) | (inIdx < input.Length ? input[inIdx++] : 0);
                low <<= 8;
                range <<= 8;
            }
        }

        output.Advance(originalLength);
    }

    private static int BinarySearchCumFreq(ReadOnlySpan<uint> cumFreq, uint target)
    {
        int low = 0;
        int high = 255;

        while (low <= high)
        {
            int mid = (low + high) >> 1;
            if (cumFreq[mid + 1] <= target)
            {
                low = mid + 1;
            }
            else if (cumFreq[mid] > target)
            {
                high = mid - 1;
            }
            else
            {
                return mid;
            }
        }

        return Math.Clamp(low, 0, 255);
    }

    private static void NormalizeFrequencies(ReadOnlySpan<int> rawFreq, int inputLength, Span<uint> freq, Span<uint> cumFreq)
    {
        uint allocated = 0;
        for (int i = 0; i < 256; i++)
        {
            if (rawFreq[i] > 0)
            {
                // Ensure every present symbol has at least frequency 1
                uint f = (uint)Math.Max(1, (long)rawFreq[i] * TotalFreq / inputLength);
                freq[i] = f;
                allocated += f;
            }
            else
            {
                freq[i] = 0;
            }
        }

        // Adjust to exactly TotalFreq
        while (allocated > TotalFreq)
        {
            for (int i = 0; i < 256 && allocated > TotalFreq; i++)
            {
                if (freq[i] > 1) { freq[i]--; allocated--; }
            }
        }
        while (allocated < TotalFreq)
        {
            for (int i = 0; i < 256 && allocated < TotalFreq; i++)
            {
                if (freq[i] > 0) { freq[i]++; allocated++; }
            }
        }

        cumFreq[0] = 0;
        for (int i = 0; i < 256; i++)
        {
            cumFreq[i + 1] = cumFreq[i] + freq[i];
        }
    }
}
