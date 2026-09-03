using System.Buffers;
using ExtremeCompression.Container;

namespace ExtremeCompression.Streaming;

/// <summary>
/// Provides O(1) random access to individual compressed blocks in a KXCP container.
/// Allows extracting block #500 without parsing or decompressing blocks 0..499.
/// </summary>
public sealed class RandomAccessBlockReader : IAsyncDisposable
{
    private readonly Stream _stream;
    private readonly ContainerReader _reader;
    private IReadOnlyList<BlockHeader>? _blockTable;

    public RandomAccessBlockReader(Stream seekableStream)
    {
        if (!seekableStream.CanSeek)
            throw new ArgumentException("Stream must be seekable for random access", nameof(seekableStream));

        _stream = seekableStream;
        _reader = new ContainerReader(_stream);
    }

    /// <summary>
    /// Loads container metadata and block index table.
    /// </summary>
    public async ValueTask InitializeAsync(CancellationToken cancellationToken = default)
    {
        _blockTable = await _reader.LoadBlockTableAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Decompresses and returns the exact bytes of a specific block by index.
    /// </summary>
    public async ValueTask<byte[]> ReadBlockAsync(int blockIndex, CancellationToken cancellationToken = default)
    {
        if (_blockTable == null)
            await InitializeAsync(cancellationToken).ConfigureAwait(false);

        if (blockIndex < 0 || blockIndex >= _blockTable!.Count)
            throw new ArgumentOutOfRangeException(nameof(blockIndex), $"Block index {blockIndex} is out of range (Total blocks: {_blockTable!.Count})");

        BlockHeader header = _blockTable[blockIndex];
        if (header.OriginalSize == 0) return Array.Empty<byte>();

        // Seek directly to payload
        _stream.Seek(header.PayloadOffset, SeekOrigin.Begin);

        byte[] compressed = ArrayPool<byte>.Shared.Rent(header.CompressedSize);
        byte[] decompressed = new byte[header.OriginalSize];

        try
        {
            int totalRead = 0;
            while (totalRead < header.CompressedSize)
            {
                int read = await _stream.ReadAsync(compressed.AsMemory(totalRead, header.CompressedSize - totalRead), cancellationToken).ConfigureAwait(false);
                if (read == 0) throw new InvalidDataException("Unexpected EOF reading block payload");
                totalRead += read;
            }

            CompressionEngine.DecompressBlock(
                header,
                compressed.AsSpan(0, header.CompressedSize),
                decompressed.AsSpan(0, header.OriginalSize));

            return decompressed;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(compressed);
        }
    }

    public ValueTask DisposeAsync()
    {
        return ValueTask.CompletedTask;
    }
}
