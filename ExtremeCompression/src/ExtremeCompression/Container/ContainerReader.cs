using System.Buffers;
using ExtremeCompression;
using ExtremeCompression.Entropy;
using ExtremeCompression.Transforms;

namespace ExtremeCompression.Container;

/// <summary>
/// Reads KXCP container archives, parses headers, verifies magic bytes, and provides random block access.
/// </summary>
public sealed class ContainerReader
{
    private readonly Stream _source;
    private ContainerHeader? _header;
    private List<BlockHeader>? _blockTable;

    public ContainerHeader Header => _header ?? throw new InvalidOperationException("Header not parsed yet. Call ReadHeaderAsync().");
    public IReadOnlyList<BlockHeader> BlockTable => _blockTable ?? throw new InvalidOperationException("Block table not parsed yet.");

    public ContainerReader(Stream source)
    {
        _source = source;
    }

    /// <summary>
    /// Reads and validates root container header.
    /// </summary>
    public async ValueTask<ContainerHeader> ReadHeaderAsync(CancellationToken cancellationToken = default)
    {
        byte[] headerBuffer = ArrayPool<byte>.Shared.Rent(ContainerConstants.HeaderSize);
        try
        {
            int read = await ReadExactAsync(_source, headerBuffer.AsMemory(0, ContainerConstants.HeaderSize), cancellationToken).ConfigureAwait(false);
            if (read < ContainerConstants.HeaderSize)
                throw new InvalidDataException("Unexpected end of stream while reading container header");

            ReadOnlySpan<byte> span = headerBuffer.AsSpan(0, ContainerConstants.HeaderSize);
            uint magic = System.Runtime.InteropServices.MemoryMarshal.Read<uint>(span.Slice(0));
            if (magic != ContainerConstants.Magic)
                throw new InvalidDataException($"Invalid KXCP magic bytes: 0x{magic:X8}");

            ushort version = System.Runtime.InteropServices.MemoryMarshal.Read<ushort>(span.Slice(4));
            if (version > ContainerConstants.CurrentVersion)
                throw new InvalidDataException($"Unsupported KXCP version: {version}. Max supported is {ContainerConstants.CurrentVersion}");

            ushort flags = System.Runtime.InteropServices.MemoryMarshal.Read<ushort>(span.Slice(6));
            int defaultBlockSize = System.Runtime.InteropServices.MemoryMarshal.Read<int>(span.Slice(8));
            long totalOriginal = System.Runtime.InteropServices.MemoryMarshal.Read<long>(span.Slice(12));
            int blockCount = System.Runtime.InteropServices.MemoryMarshal.Read<int>(span.Slice(20));
            long tableOffset = System.Runtime.InteropServices.MemoryMarshal.Read<long>(span.Slice(24));

            _header = new ContainerHeader
            {
                Magic = magic,
                Version = version,
                Flags = flags,
                DefaultBlockSize = defaultBlockSize,
                OriginalTotalSize = totalOriginal,
                BlockCount = blockCount,
                BlockTableOffset = tableOffset
            };

            return _header;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(headerBuffer);
        }
    }

    /// <summary>
    /// Loads the global block table from the archive if seekable.
    /// </summary>
    public async ValueTask<IReadOnlyList<BlockHeader>> LoadBlockTableAsync(CancellationToken cancellationToken = default)
    {
        if (_blockTable != null) return _blockTable;
        if (_header == null) await ReadHeaderAsync(cancellationToken).ConfigureAwait(false);

        if (_source.CanSeek && _header!.BlockTableOffset > 0 && _header.BlockCount > 0)
        {
            long originalPos = _source.Position;
            _source.Seek(_header.BlockTableOffset, SeekOrigin.Begin);

            int tableBytes = _header.BlockCount * ContainerConstants.BlockEntrySize;
            byte[] buffer = ArrayPool<byte>.Shared.Rent(tableBytes);
            try
            {
                await ReadExactAsync(_source, buffer.AsMemory(0, tableBytes), cancellationToken).ConfigureAwait(false);
                var list = new List<BlockHeader>(_header.BlockCount);
                ReadOnlySpan<byte> span = buffer.AsSpan(0, tableBytes);

                for (int i = 0; i < _header.BlockCount; i++)
                {
                    var bh = DeserializeBlockHeader(span.Slice(i * ContainerConstants.BlockEntrySize, ContainerConstants.BlockEntrySize));
                    bh.BlockIndex = i;
                    list.Add(bh);
                }

                _blockTable = list;
                _source.Seek(originalPos, SeekOrigin.Begin);
                return _blockTable;
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(buffer);
            }
        }

        return Array.Empty<BlockHeader>();
    }

    /// <summary>
    /// Reads the next sequential block header from current stream position.
    /// Returns null when end of blocks is reached.
    /// </summary>
    public async ValueTask<BlockHeader?> ReadNextBlockHeaderAsync(CancellationToken cancellationToken = default)
    {
        byte[] entryBuffer = ArrayPool<byte>.Shared.Rent(ContainerConstants.BlockEntrySize);
        try
        {
            int read = await ReadExactAsync(_source, entryBuffer.AsMemory(0, ContainerConstants.BlockEntrySize), cancellationToken).ConfigureAwait(false);
            if (read == 0) return null;
            if (read < ContainerConstants.BlockEntrySize)
                throw new InvalidDataException("Unexpected end of stream while reading block header");

            return DeserializeBlockHeader(entryBuffer.AsSpan(0, ContainerConstants.BlockEntrySize));
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(entryBuffer);
        }
    }

    public static BlockHeader DeserializeBlockHeader(ReadOnlySpan<byte> span)
    {
        int compSize = System.Runtime.InteropServices.MemoryMarshal.Read<int>(span.Slice(0));
        int origSize = System.Runtime.InteropServices.MemoryMarshal.Read<int>(span.Slice(4));
        var codec = (EntropyCodecType)span[8];
        var transform = (TransformType)span[9];
        var flags = (BlockFlags)span[10];
        var checksumType = (ChecksumType)span[11];
        ulong checksum = System.Runtime.InteropServices.MemoryMarshal.Read<ulong>(span.Slice(12));
        long offset = System.Runtime.InteropServices.MemoryMarshal.Read<long>(span.Slice(20));

        return new BlockHeader
        {
            CompressedSize = compSize,
            OriginalSize = origSize,
            Codec = codec,
            Transform = transform,
            Flags = flags,
            ChecksumType = checksumType,
            Checksum = checksum,
            PayloadOffset = offset
        };
    }

    private static async ValueTask<int> ReadExactAsync(Stream stream, Memory<byte> buffer, CancellationToken ct)
    {
        int totalRead = 0;
        while (totalRead < buffer.Length)
        {
            int read = await stream.ReadAsync(buffer.Slice(totalRead), ct).ConfigureAwait(false);
            if (read == 0) break;
            totalRead += read;
        }
        return totalRead;
    }
}
