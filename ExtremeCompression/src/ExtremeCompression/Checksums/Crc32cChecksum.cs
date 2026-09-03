using System.Runtime.CompilerServices;
using System.Runtime.Intrinsics.X86;
using System.Runtime.Intrinsics.Arm;

namespace ExtremeCompression.Checksums;

/// <summary>
/// Hardware-accelerated CRC-32C (Castagnoli) checksum with table-driven scalar fallback.
/// Polynomial: 0x1EDC6F41 (reversed 0x82F63B78).
/// </summary>
public sealed class Crc32cChecksum : IChecksum
{
    private static readonly uint[] Table = GenerateTable();

    public ulong Compute(ReadOnlySpan<byte> data)
    {
        uint crc = 0xFFFFFFFFU;

        if (Sse42.IsSupported)
        {
            int offset = 0;
            if (Sse42.X64.IsSupported)
            {
                while (offset + 8 <= data.Length)
                {
                    ulong val = System.Runtime.InteropServices.MemoryMarshal.Read<ulong>(data.Slice(offset));
                    crc = (uint)Sse42.X64.Crc32(crc, val);
                    offset += 8;
                }
            }

            while (offset + 4 <= data.Length)
            {
                uint val = System.Runtime.InteropServices.MemoryMarshal.Read<uint>(data.Slice(offset));
                crc = Sse42.Crc32(crc, val);
                offset += 4;
            }

            while (offset < data.Length)
            {
                crc = Sse42.Crc32(crc, data[offset]);
                offset++;
            }

            return ~crc;
        }

        if (Crc32.IsSupported)
        {
            int offset = 0;
            if (Crc32.Arm64.IsSupported)
            {
                while (offset + 8 <= data.Length)
                {
                    ulong val = System.Runtime.InteropServices.MemoryMarshal.Read<ulong>(data.Slice(offset));
                    crc = (uint)Crc32.Arm64.ComputeCrc32C(crc, val);
                    offset += 8;
                }
            }

            while (offset + 4 <= data.Length)
            {
                uint val = System.Runtime.InteropServices.MemoryMarshal.Read<uint>(data.Slice(offset));
                crc = Crc32.ComputeCrc32C(crc, val);
                offset += 4;
            }

            while (offset < data.Length)
            {
                crc = Crc32.ComputeCrc32C(crc, data[offset]);
                offset++;
            }

            return ~crc;
        }

        // Table fallback
        for (int i = 0; i < data.Length; i++)
        {
            byte index = (byte)(crc ^ data[i]);
            crc = (crc >> 8) ^ Table[index];
        }

        return ~crc;
    }

    private static uint[] GenerateTable()
    {
        const uint poly = 0x82F63B78U;
        uint[] table = new uint[256];
        for (uint i = 0; i < 256; i++)
        {
            uint entry = i;
            for (int j = 0; j < 8; j++)
            {
                entry = (entry & 1) != 0 ? (entry >> 1) ^ poly : (entry >> 1);
            }
            table[i] = entry;
        }
        return table;
    }
}
