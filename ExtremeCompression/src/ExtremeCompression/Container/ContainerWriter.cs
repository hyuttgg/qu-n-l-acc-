using System.Buffers;
using ExtremeCompression;

namespace ExtremeCompression.Container;

/// <summary>
/// Writes KXCP v1 container headers, block metadata, and payload streams.
/// </summary>
public sealed class ContainerWriter
{
    private readonly Stream _destination;
    private readonly List<BlockHeader> _blockHeaders = new();
    private long _totalOriginalBytes;

    public ContainerWriter(Stream destination)
    {
        _destination = destination;
    }

    /// <summary>
    /// Writes root container header placeholder.
    /// </summary>
    public async ValueTask WriteHeaderAsync(int defaultBlockSize, CancellationToken cancellationToken = default)
    {
        byte[] headerBytes = ArrayPool<byte>.Shared.Rent(ContainerConstants.HeaderSize);
        try
        {
            Span<byte> span = headerBytes.AsSpan(0, ContainerConstants.HeaderSize);
            span.Clear();

            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(0), ContainerConstants.Magic);
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(4), ContainerConstants.CurrentVersion);
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(6), (ushort)0);
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(8), defaultBlockSize);
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(12), 0L); // placeholder for original size
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(20), 0); // placeholder for block count
            System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(24), 0L); // placeholder for table offset

            await _destination.WriteAsync(headerBytes.AsMemory(0, ContainerConstants.HeaderSize), cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(headerBytes);
        }
    }

    /// <summary>
    /// Writes a single block (header + payload) to the container.
    /// </summary>
    public async ValueTask WriteBlockAsync(BlockHeader header, ReadOnlyMemory<byte> payload, CancellationToken cancellationToken = default)
    {
        header.PayloadOffset = _destination.CanSeek ? _destination.Position + ContainerConstants.BlockEntrySize : 0;
        header.BlockIndex = _blockHeaders.Count;
        _blockHeaders.Add(header);
        _totalOriginalBytes += header.OriginalSize;

        byte[] entryBuffer = ArrayPool<byte>.Shared.Rent(ContainerConstants.BlockEntrySize);
        try
        {
            Span<byte> span = entryBuffer.AsSpan(0, ContainerConstants.BlockEntrySize);
            SerializeBlockHeader(header, span);

            await _destination.WriteAsync(entryBuffer.AsMemory(0, ContainerConstants.BlockEntrySize), cancellationToken).ConfigureAwait(false);
            await _destination.WriteAsync(payload, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(entryBuffer);
        }
    }

    /// <summary>
    /// Finalizes the archive by writing the global block table and updating the root header if seekable.
    /// </summary>
    public async ValueTask FinalizeAsync(CancellationToken cancellationToken = default)
    {
        long tableOffset = _destination.CanSeek ? _destination.Position : 0;

        // Write Block Table
        byte[] tableBuffer = ArrayPool<byte>.Shared.Rent(_blockHeaders.Count * ContainerConstants.BlockEntrySize);
        try
        {
            Span<byte> span = tableBuffer.AsSpan(0, _blockHeaders.Count * ContainerConstants.BlockEntrySize);
            for (int i = 0; i < _blockHeaders.Count; i++)
            {
                SerializeBlockHeader(_blockHeaders[i], span.Slice(i * ContainerConstants.BlockEntrySize, ContainerConstants.BlockEntrySize));
            }

            await _destination.WriteAsync(tableBuffer.AsMemory(0, _blockHeaders.Count * ContainerConstants.BlockEntrySize), cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(tableBuffer);
        }

        // If seekable, rewind and write updated root header with exact total size, block count, and table offset
        if (_destination.CanSeek)
        {
            long currentPos = _destination.Position;
            _destination.Seek(0, SeekOrigin.Begin);

            byte[] headerBytes = ArrayPool<byte>.Shared.Rent(ContainerConstants.HeaderSize);
            try
            {
                Span<byte> span = headerBytes.AsSpan(0, ContainerConstants.HeaderSize);
                span.Clear();

                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(0), ContainerConstants.Magic);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(4), ContainerConstants.CurrentVersion);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(6), (ushort)0);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(8), _blockHeaders.Count > 0 ? _blockHeaders[0].OriginalSize : 0);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(12), _totalOriginalBytes);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(20), _blockHeaders.Count);
                System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(24), tableOffset);

                await _destination.WriteAsync(headerBytes.AsMemory(0, ContainerConstants.HeaderSize), cancellationToken).ConfigureAwait(false);
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(headerBytes);
            }

            _destination.Seek(currentPos, SeekOrigin.Begin);
        }

        await _destination.FlushAsync(cancellationToken).ConfigureAwait(false);
    }

    private static void SerializeBlockHeader(BlockHeader header, Span<byte> span)
    {
        System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(0), header.CompressedSize);
        System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(4), header.OriginalSize);
        span[8] = (byte)header.Codec;
        span[9] = (byte)header.Transform;
        span[10] = (byte)header.Flags;
        span[11] = (byte)header.ChecksumType;
        System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(12), header.Checksum);
        System.Runtime.InteropServices.MemoryMarshal.Write(span.Slice(20), header.PayloadOffset);
    }
}
