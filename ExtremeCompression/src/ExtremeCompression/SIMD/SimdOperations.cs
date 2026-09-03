using System.Numerics;
using System.Runtime.CompilerServices;
using System.Runtime.Intrinsics;
using System.Runtime.Intrinsics.X86;
using System.Runtime.Intrinsics.Arm;

namespace ExtremeCompression.SIMD;

/// <summary>
/// Hardware-accelerated SIMD primitives with safe scalar fallbacks.
/// Hot-paths dynamically inspect CPU capabilities (AVX2, SSE2, ARM NEON, or Vector&lt;T&gt;).
/// </summary>
public static class SimdOperations
{
    /// <summary>
    /// Computes the length of the matching prefix between two spans up to maxLength.
    /// Used by LZ match finders to rapidly confirm and measure match lengths.
    /// </summary>
    [MethodImpl(MethodImplOptions.AggressiveOptimization | MethodImplOptions.AggressiveInlining)]
    public static int FindCommonPrefixLength(ReadOnlySpan<byte> a, ReadOnlySpan<byte> b, int maxLength)
    {
        int limit = Math.Min(maxLength, Math.Min(a.Length, b.Length));
        int offset = 0;

        // 32-byte chunks via Vector256 (AVX2)
        if (Vector256.IsHardwareAccelerated && limit - offset >= Vector256<byte>.Count)
        {
            unsafe
            {
                fixed (byte* pA = a, pB = b)
                {
                    while (offset + Vector256<byte>.Count <= limit)
                    {
                        var va = Vector256.Load(pA + offset);
                        var vb = Vector256.Load(pB + offset);
                        var cmp = Vector256.Equals(va, vb);
                        uint mask = Vector256.ExtractMostSignificantBits(cmp);

                        if (mask != 0xFFFFFFFFU)
                        {
                            // Some byte differed
                            int mismatch = BitOperations.TrailingZeroCount(~mask);
                            return offset + mismatch;
                        }
                        offset += Vector256<byte>.Count;
                    }
                }
            }
        }
        // 16-byte chunks via Vector128 (SSE2 / NEON)
        else if (Vector128.IsHardwareAccelerated && limit - offset >= Vector128<byte>.Count)
        {
            unsafe
            {
                fixed (byte* pA = a, pB = b)
                {
                    while (offset + Vector128<byte>.Count <= limit)
                    {
                        var va = Vector128.Load(pA + offset);
                        var vb = Vector128.Load(pB + offset);
                        var cmp = Vector128.Equals(va, vb);
                        uint mask = Vector128.ExtractMostSignificantBits(cmp);

                        if (mask != 0xFFFFU)
                        {
                            int mismatch = BitOperations.TrailingZeroCount((uint)(~mask & 0xFFFF));
                            return offset + mismatch;
                        }
                        offset += Vector128<byte>.Count;
                    }
                }
            }
        }

        // 8-byte chunks via ulong
        while (offset + 8 <= limit)
        {
            ulong vA = System.Runtime.InteropServices.MemoryMarshal.Read<ulong>(a.Slice(offset));
            ulong vB = System.Runtime.InteropServices.MemoryMarshal.Read<ulong>(b.Slice(offset));
            ulong diff = vA ^ vB;
            if (diff != 0)
            {
                int bitDiff = BitOperations.TrailingZeroCount(diff);
                return offset + (bitDiff >> 3);
            }
            offset += 8;
        }

        // Scalar byte-by-byte fallback for remainder
        while (offset < limit && a[offset] == b[offset])
        {
            offset++;
        }

        return offset;
    }

    /// <summary>
    /// Computes the frequency of each byte (0..255) in the input buffer.
    /// </summary>
    [MethodImpl(MethodImplOptions.AggressiveOptimization)]
    public static void ComputeByteHistogram(ReadOnlySpan<byte> input, Span<int> histogram)
    {
        histogram.Clear();

        int i = 0;
        int len = input.Length;

        // Unroll by 4 for instruction-level parallelism
        int unrollLimit = len - 4;
        while (i <= unrollLimit)
        {
            histogram[input[i]]++;
            histogram[input[i + 1]]++;
            histogram[input[i + 2]]++;
            histogram[input[i + 3]]++;
            i += 4;
        }

        while (i < len)
        {
            histogram[input[i]]++;
            i++;
        }
    }

    /// <summary>
    /// Applies delta transformation: output[0] = input[0]; output[i] = input[i] - input[i-1].
    /// </summary>
    public static void DeltaEncode(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return;

        output[0] = input[0];
        byte prev = input[0];

        for (int i = 1; i < input.Length; i++)
        {
            byte cur = input[i];
            output[i] = (byte)(cur - prev);
            prev = cur;
        }
    }

    /// <summary>
    /// Inverts delta transformation: output[0] = input[0]; output[i] = output[i-1] + input[i].
    /// </summary>
    public static void DeltaDecode(ReadOnlySpan<byte> input, Span<byte> output)
    {
        if (input.IsEmpty) return;

        output[0] = input[0];
        byte acc = input[0];

        for (int i = 1; i < input.Length; i++)
        {
            acc = (byte)(acc + input[i]);
            output[i] = acc;
        }
    }
}
