using System.Buffers;
using System.Runtime.CompilerServices;

namespace ExtremeCompression.Entropy;

/// <summary>
/// High-speed bit-level stream writer with 64-bit accumulator.
/// </summary>
public ref struct BitWriter
{
    private readonly IBufferWriter<byte> _writer;
    private Span<byte> _currentSpan;
    private int _spanIndex;
    private ulong _bitBuffer;
    private int _bitCount;
    private int _totalBytesWritten;

    public int TotalBytesWritten => _totalBytesWritten + _spanIndex + (_bitCount > 0 ? 1 : 0);

    public BitWriter(IBufferWriter<byte> writer)
    {
        _writer = writer;
        _currentSpan = _writer.GetSpan(4096);
        _spanIndex = 0;
        _bitBuffer = 0;
        _bitCount = 0;
        _totalBytesWritten = 0;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void WriteBits(uint value, int count)
    {
        _bitBuffer |= ((ulong)(value & ((1UL << count) - 1))) << _bitCount;
        _bitCount += count;

        while (_bitCount >= 8)
        {
            EnsureSpanSpace(1);
            _currentSpan[_spanIndex++] = (byte)_bitBuffer;
            _bitBuffer >>= 8;
            _bitCount -= 8;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public void WriteBit(int bit)
    {
        WriteBits((uint)(bit & 1), 1);
    }

    public void Flush()
    {
        if (_bitCount > 0)
        {
            EnsureSpanSpace(1);
            _currentSpan[_spanIndex++] = (byte)_bitBuffer;
            _bitBuffer = 0;
            _bitCount = 0;
        }

        if (_spanIndex > 0)
        {
            _writer.Advance(_spanIndex);
            _totalBytesWritten += _spanIndex;
            _spanIndex = 0;
            _currentSpan = default;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private void EnsureSpanSpace(int count)
    {
        if (_spanIndex + count > _currentSpan.Length)
        {
            _writer.Advance(_spanIndex);
            _totalBytesWritten += _spanIndex;
            _currentSpan = _writer.GetSpan(Math.Max(4096, count));
            _spanIndex = 0;
        }
    }
}

/// <summary>
/// High-speed bit-level stream reader from a contiguous memory span.
/// </summary>
public ref struct BitReader
{
    private readonly ReadOnlySpan<byte> _data;
    private int _byteOffset;
    private ulong _bitBuffer;
    private int _bitCount;

    public BitReader(ReadOnlySpan<byte> data)
    {
        _data = data;
        _byteOffset = 0;
        _bitBuffer = 0;
        _bitCount = 0;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public uint ReadBits(int count)
    {
        while (_bitCount < count)
        {
            if (_byteOffset >= _data.Length)
            {
                if (_bitCount == 0)
                    throw new InvalidDataException("Unexpected end of bit stream");
                // Return what is left padded with 0
                uint remainingVal = (uint)(_bitBuffer & ((1UL << _bitCount) - 1));
                _bitCount = 0;
                return remainingVal;
            }

            _bitBuffer |= ((ulong)_data[_byteOffset++]) << _bitCount;
            _bitCount += 8;
        }

        uint result = (uint)(_bitBuffer & ((1UL << count) - 1));
        _bitBuffer >>= count;
        _bitCount -= count;
        return result;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public int ReadBit()
    {
        return (int)ReadBits(1);
    }
}
