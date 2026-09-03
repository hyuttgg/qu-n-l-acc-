using System.Buffers;
using System.Runtime.CompilerServices;
using ExtremeCompression.SIMD;

namespace ExtremeCompression;

/// <summary>
/// High-speed LZ match finder utilizing rolling hash tables and hash chains.
/// Supports configurable window sizes, search depths, greedy, and lazy matching.
/// Zero-allocation on the hot path via ArrayPool.
/// </summary>
public sealed class MatchFinder : IDisposable
{
    private readonly MatchConfig _config;
    private readonly int[] _head;
    private readonly int[] _prev;
    private readonly int _hashMask;
    private readonly int _windowMask;
    private bool _disposed;

    public MatchFinder(MatchConfig config)
    {
        _config = config;
        int buckets = config.HashBuckets;
        _hashMask = buckets - 1;

        int window = config.WindowSize;
        int pow2Window = 1;
        while (pow2Window < window) pow2Window <<= 1;
        _windowMask = pow2Window - 1;

        _head = ArrayPool<int>.Shared.Rent(buckets);
        _prev = ArrayPool<int>.Shared.Rent(pow2Window);

        _head.AsSpan(0, buckets).Fill(-1);
        _prev.AsSpan(0, pow2Window).Fill(-1);
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private int Hash4(ReadOnlySpan<byte> data, int pos)
    {
        uint val = System.Runtime.InteropServices.MemoryMarshal.Read<uint>(data.Slice(pos));
        return (int)((val * 0x9E3779B1U) >> 13) & _hashMask;
    }

    [MethodImpl(MethodImplOptions.AggressiveOptimization)]
    public Match FindBestMatch(ReadOnlySpan<byte> data, int pos)
    {
        int minMatch = _config.MinMatchLength;
        int maxAllowed = Math.Min(_config.MaxMatchLength, data.Length - pos);

        if (maxAllowed < minMatch || pos < 1)
        {
            return Match.Empty;
        }

        int hash = Hash4(data, pos);
        int cur = _head[hash];

        _prev[pos & _windowMask] = cur;
        _head[hash] = pos;

        int bestLen = minMatch - 1;
        int bestDist = 0;
        int depth = _config.SearchDepth;
        int window = _config.WindowSize;

        ReadOnlySpan<byte> target = data.Slice(pos);

        while (cur != -1 && depth-- > 0)
        {
            int dist = pos - cur;
            if (dist <= 0 || dist > window)
            {
                break;
            }

            if (data[cur + bestLen] == target[bestLen] && data[cur] == target[0])
            {
                int len = SimdOperations.FindCommonPrefixLength(target, data.Slice(cur), maxAllowed);
                if (len > bestLen)
                {
                    bestLen = len;
                    bestDist = dist;

                    if (len >= maxAllowed)
                    {
                        break;
                    }
                }
            }

            cur = _prev[cur & _windowMask];
        }

        return bestLen >= minMatch ? new Match(bestDist, bestLen) : Match.Empty;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void InsertPosition(ReadOnlySpan<byte> data, int pos)
    {
        if (pos + 4 <= data.Length)
        {
            int hash = Hash4(data, pos);
            _prev[pos & _windowMask] = _head[hash];
            _head[hash] = pos;
        }
    }

    public void Reset()
    {
        _head.AsSpan(0, _config.HashBuckets).Fill(-1);
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            ArrayPool<int>.Shared.Return(_head);
            ArrayPool<int>.Shared.Return(_prev);
            _disposed = true;
        }
    }
}
