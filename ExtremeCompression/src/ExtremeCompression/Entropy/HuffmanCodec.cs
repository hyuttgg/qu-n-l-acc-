using System.Buffers;
using ExtremeCompression.SIMD;

namespace ExtremeCompression.Entropy;

/// <summary>
/// Canonical Huffman entropy codec. Computes optimal prefix codes and serializes compact codebooks.
/// </summary>
public sealed class HuffmanCodec : IEntropyCodec
{
    public EntropyCodecType Type => EntropyCodecType.Huffman;

    public void Encode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.IsEmpty)
        {
            Span<byte> emptyHdr = output.GetSpan(4);
            System.Runtime.InteropServices.MemoryMarshal.Write(emptyHdr, 0);
            output.Advance(4);
            return;
        }

        // 1. Calculate symbol frequencies
        Span<int> freq = stackalloc int[256];
        SimdOperations.ComputeByteHistogram(input, freq);

        // 2. Build Huffman tree / code lengths
        Span<byte> codeLengths = stackalloc byte[256];
        BuildCodeLengths(freq, codeLengths);

        // 3. Generate Canonical Huffman Codes
        Span<uint> codes = stackalloc uint[256];
        GenerateCanonicalCodes(codeLengths, codes);

        // 4. Write Header: Original Length (4 bytes) + Codebook
        var writer = new BitWriter(output);
        writer.WriteBits((uint)input.Length, 32);

        // Count non-zero symbols
        int activeCount = 0;
        for (int i = 0; i < 256; i++)
        {
            if (codeLengths[i] > 0) activeCount++;
        }
        writer.WriteBits((uint)(activeCount - 1), 8); // 0..255 mapped to 0..255

        for (int i = 0; i < 256; i++)
        {
            if (codeLengths[i] > 0)
            {
                writer.WriteBits((uint)i, 8);
                writer.WriteBits(codeLengths[i], 5); // lengths are <= 16 bits
            }
        }

        // 5. Encode payload
        for (int i = 0; i < input.Length; i++)
        {
            byte b = input[i];
            writer.WriteBits(codes[b], codeLengths[b]);
        }

        writer.Flush();
    }

    public void Decode(ReadOnlySpan<byte> input, IBufferWriter<byte> output)
    {
        if (input.Length < 4)
            throw new InvalidDataException("Truncated Huffman stream header");

        var reader = new BitReader(input);
        int originalLength = (int)reader.ReadBits(32);
        if (originalLength == 0) return;

        int activeCount = (int)reader.ReadBits(8) + 1;

        Span<byte> codeLengths = stackalloc byte[256];
        codeLengths.Clear();

        for (int i = 0; i < activeCount; i++)
        {
            byte sym = (byte)reader.ReadBits(8);
            byte len = (byte)reader.ReadBits(5);
            codeLengths[sym] = len;
        }

        // Generate Canonical Codes and inverted fast lookup table
        Span<uint> codes = stackalloc uint[256];
        GenerateCanonicalCodes(codeLengths, codes);

        // Build 2-level lookup or tree table
        Span<byte> outSpan = output.GetSpan(originalLength);
        int written = 0;

        // Decode symbols using Canonical bit matching
        while (written < originalLength)
        {
            uint currentCode = 0;
            int bitLen = 0;
            bool matched = false;

            while (bitLen < 24)
            {
                int bit = reader.ReadBit();
                currentCode |= ((uint)bit << bitLen);
                bitLen++;

                // Check against canonical codes of matching length
                for (int s = 0; s < 256; s++)
                {
                    if (codeLengths[s] == bitLen && codes[s] == currentCode)
                    {
                        outSpan[written++] = (byte)s;
                        matched = true;
                        break;
                    }
                }

                if (matched) break;
            }

            if (!matched)
                throw new InvalidDataException("Invalid Huffman code sequence");
        }

        output.Advance(originalLength);
    }

    private static void BuildCodeLengths(ReadOnlySpan<int> freq, Span<byte> codeLengths)
    {
        // Simple priority queue Huffman builder
        // Nodes: weight, symbol, left, right
        Span<int> weights = stackalloc int[512];
        Span<int> left = stackalloc int[512];
        Span<int> right = stackalloc int[512];
        Span<int> activeNodes = stackalloc int[256];

        int nodeCount = 0;
        int activeCount = 0;

        for (int i = 0; i < 256; i++)
        {
            if (freq[i] > 0)
            {
                weights[nodeCount] = freq[i];
                left[nodeCount] = -1;
                right[nodeCount] = -1;
                activeNodes[activeCount++] = nodeCount;
                nodeCount++;
            }
        }

        if (activeCount == 0) return;

        if (activeCount == 1)
        {
            // Single symbol edge case
            codeLengths[0] = 1;
            return;
        }

        while (activeCount > 1)
        {
            // Find two lowest weight nodes
            int min1Idx = 0, min2Idx = 1;
            if (weights[activeNodes[min1Idx]] > weights[activeNodes[min2Idx]])
            {
                (min1Idx, min2Idx) = (min2Idx, min1Idx);
            }

            for (int i = 2; i < activeCount; i++)
            {
                int w = weights[activeNodes[i]];
                if (w < weights[activeNodes[min1Idx]])
                {
                    min2Idx = min1Idx;
                    min1Idx = i;
                }
                else if (w < weights[activeNodes[min2Idx]])
                {
                    min2Idx = i;
                }
            }

            int node1 = activeNodes[min1Idx];
            int node2 = activeNodes[min2Idx];

            int parent = nodeCount++;
            weights[parent] = weights[node1] + weights[node2];
            left[parent] = node1;
            right[parent] = node2;

            // Replace min1 with parent, remove min2
            activeNodes[min1Idx] = parent;
            activeNodes[min2Idx] = activeNodes[activeCount - 1];
            activeCount--;
        }

        int root = activeNodes[0];
        TraverseLengths(root, 0, left, right, codeLengths);
    }

    private static void TraverseLengths(int node, int depth, ReadOnlySpan<int> left, ReadOnlySpan<int> right, Span<byte> codeLengths)
    {
        if (left[node] == -1 && right[node] == -1)
        {
            // Leaf: cap max length at 16 for stability
            codeLengths[node] = (byte)Math.Clamp(depth == 0 ? 1 : depth, 1, 16);
            return;
        }

        if (left[node] != -1) TraverseLengths(left[node], depth + 1, left, right, codeLengths);
        if (right[node] != -1) TraverseLengths(right[node], depth + 1, left, right, codeLengths);
    }

    private static void GenerateCanonicalCodes(ReadOnlySpan<byte> lengths, Span<uint> codes)
    {
        codes.Clear();
        uint currentCode = 0;

        for (int len = 1; len <= 16; len++)
        {
            for (int s = 0; s < 256; s++)
            {
                if (lengths[s] == len)
                {
                    codes[s] = currentCode;
                    currentCode++;
                }
            }
            currentCode <<= 1;
        }
    }
}
