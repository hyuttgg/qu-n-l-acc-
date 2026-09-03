using System.Buffers;
using ExtremeCompression.SIMD;

namespace ExtremeCompression.Entropy;

/// <summary>
/// Asymmetric Numeral Systems (rANS) entropy codec.
/// Combines the speed of table lookups with near-optimal Shannon entropy compression ratios.
/// </summary>
public sealed class AnsCodec : IEntropyCodec
{
    public EntropyCodecType Type => EntropyCodecType.Ans;

    private const uint ScaleBits = 12;
    private const uint Scale = 1U << (int)ScaleBits; // 4096
    private const uint Mask = Scale - 1;
    private const uint RansLower = 1U << 15; // 32768

    public void Encode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.IsEmpty)
        {
            Span<byte> emptyHdr = output.GetSpan(4);
            System.Runtime.InteropServices.MemoryMarshal.Write(emptyHdr, 0);
            output.Advance(4);
            return;
        }

        // 1. Calculate and normalize frequencies
        Span<int> rawFreq = stackalloc int[256];
        SimdOperations.ComputeByteHistogram(input, rawFreq);

        Span<uint> freq = stackalloc uint[256];
        Span<uint> cumFreq = stackalloc uint[257];
        NormalizeFrequencies(rawFreq, input.Length, freq, cumFreq);

        // 2. Encode in reverse using rANS state
        // Rent temporary buffer for backwards byte emission
        byte[] tempBuffer = ArrayPool<byte>.Shared.Rent(input.Length * 2 + 1024);
        try
        {
            int outPos = tempBuffer.Length;
            uint state = RansLower;

            for (int i = input.Length - 1; i >= 0; i--)
            {
                byte s = input[i];
                uint f = freq[s];
                uint c = cumFreq[s];

                // Renormalize
                uint maxState = ((RansLower >> (int)ScaleBits) << 8) * f;
                while (state >= maxState)
                {
                    tempBuffer[--outPos] = (byte)(state & 0xFF);
                    state >>= 8;
                }

                // rANS step
                state = ((state / f) << (int)ScaleBits) + (state % f) + c;
            }

            // Flush final state (4 bytes)
            tempBuffer[--outPos] = (byte)(state & 0xFF);
            tempBuffer[--outPos] = (byte)((state >> 8) & 0xFF);
            tempBuffer[--outPos] = (byte)((state >> 16) & 0xFF);
            tempBuffer[--outPos] = (byte)((state >> 24) & 0xFF);

            // 3. Write Header: Length (4 bytes) + Frequencies + Payload
            Span<byte> header = output.GetSpan(4 + 512);
            int hIdx = 0;
            System.Runtime.InteropServices.MemoryMarshal.Write(header.Slice(hIdx), (uint)input.Length);
            hIdx += 4;

            for (int i = 0; i < 256; i++)
            {
                System.Runtime.InteropServices.MemoryMarshal.Write(header.Slice(hIdx), (ushort)freq[i]);
                hIdx += 2;
            }
            output.Advance(hIdx);

            // Write rANS payload
            int payloadLength = tempBuffer.Length - outPos;
            Span<byte> payloadSpan = output.GetSpan(payloadLength);
            tempBuffer.AsSpan(outPos, payloadLength).CopyTo(payloadSpan);
            output.Advance(payloadLength);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(tempBuffer);
        }
    }

    public void Decode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.Length < 4 + 512 + 4)
            throw new InvalidDataException("Truncated ANS stream header");

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

        // Initialize state from stream
        uint state = (uint)input[inIdx++] << 24;
        state |= (uint)input[inIdx++] << 16;
        state |= (uint)input[inIdx++] << 8;
        state |= input[inIdx++];

        Span<byte> outSpan = output.GetSpan(originalLength);

        // Precompute quick inverse lookup for the 4096 scale
        Span<byte> slotToSym = stackalloc byte[(int)Scale];
        for (int s = 0; s < 256; s++)
        {
            uint start = cumFreq[s];
            uint end = cumFreq[s + 1];
            for (uint k = start; k < end; k++)
            {
                slotToSym[(int)k] = (byte)s;
            }
        }

        for (int i = 0; i < originalLength; i++)
        {
            uint slot = state & Mask;
            byte sym = slotToSym[(int)slot];
            outSpan[i] = sym;

            uint f = freq[sym];
            uint c = cumFreq[sym];

            // Invert rANS step
            state = f * (state >> (int)ScaleBits) + slot - c;

            // Renormalize
            while (state < RansLower && inIdx < input.Length)
            {
                state = (state << 8) | input[inIdx++];
            }
        }

        output.Advance(originalLength);
    }

    private static void NormalizeFrequencies(ReadOnlySpan<int> rawFreq, int inputLength, Span<uint> freq, Span<uint> cumFreq)
    {
        uint allocated = 0;
        for (int i = 0; i < 256; i++)
        {
            if (rawFreq[i] > 0)
            {
                uint f = (uint)Math.Max(1, (long)rawFreq[i] * Scale / inputLength);
                freq[i] = f;
                allocated += f;
            }
            else
            {
                freq[i] = 0;
            }
        }

        while (allocated > Scale)
        {
            for (int i = 0; i < 256 && allocated > Scale; i++)
            {
                if (freq[i] > 1) { freq[i]--; allocated--; }
            }
        }
        while (allocated < Scale)
        {
            for (int i = 0; i < 256 && allocated < Scale; i++)
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
