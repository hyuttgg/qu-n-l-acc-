const fs = require('fs');
const path = require('path');

// Helper to encode unsigned LEB128
function encodeUnsignedLEB128(val) {
  const bytes = [];
  do {
    let byte = val & 0x7f;
    val >>>= 7;
    if (val !== 0) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (val !== 0);
  return bytes;
}

// Helper to encode signed LEB128 (for i32.const)
function encodeSignedLEB128(val) {
  const bytes = [];
  let more = true;
  while (more) {
    let byte = val & 0x7f;
    val >>= 7; // arithmetic shift
    // Sign bit of byte is second high bit (0x40)
    if ((val === 0 && (byte & 0x40) === 0) || (val === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

function createOceanForgeWasm() {
  const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

  function createSection(id, payload) {
    return [id, ...encodeUnsignedLEB128(payload.length), ...payload];
  }

  // Type Section (1)
  // Type 0: (i32, i32) -> i32
  // Type 1: () -> i32
  const typesPayload = [
    0x02, // 2 types
    0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // Type 0: (i32, i32) -> i32
    0x60, 0x00, 0x01, 0x7f              // Type 1: () -> i32
  ];
  const typeSection = createSection(1, typesPayload);

  // Function Section (3)
  const funcPayload = [0x04, 0x00, 0x00, 0x00, 0x01];
  const funcSection = createSection(3, funcPayload);

  // Memory Section (5) - 1 page initial, 10 max
  const memoryPayload = [0x01, 0x01, 0x01, 0x0a];
  const memorySection = createSection(5, memoryPayload);

  // Export Section (7)
  function encodeString(str) {
    const buf = Buffer.from(str, 'utf8');
    return [...encodeUnsignedLEB128(buf.length), ...buf];
  }

  const exportsPayload = [
    0x05, // 5 exports
    ...encodeString('memory'), 0x02, 0x00,
    ...encodeString('encrypt_byte'), 0x00, 0x00,
    ...encodeString('compute_checksum'), 0x00, 0x01,
    ...encodeString('fast_hash'), 0x00, 0x02,
    ...encodeString('get_wasm_version'), 0x00, 0x03
  ];
  const exportSection = createSection(7, exportsPayload);

  // Code Section (10)
  // Func 0: encrypt_byte(b: i32, k: i32) -> (b ^ k)
  const func0Body = [
    0x00, // 0 locals
    0x20, 0x00, // local.get 0
    0x20, 0x01, // local.get 1
    0x73,       // i32.xor
    0x0b        // end
  ];

  // Func 1: compute_checksum(offset: i32, length: i32) -> i32 (Adler-32)
  // Locals: 3 locals of type i32 (sum1=local 2, sum2=local 3, i=local 4)
  const func1Body = [
    0x01, 0x03, 0x7f, // 3 locals of i32
    0x41, ...encodeSignedLEB128(1), 0x21, 0x02, // local.set 2 (sum1 = 1)
    0x41, ...encodeSignedLEB128(0), 0x21, 0x03, // local.set 3 (sum2 = 0)
    0x41, ...encodeSignedLEB128(0), 0x21, 0x04, // local.set 4 (i = 0)
    0x02, 0x40, // block
      0x03, 0x40, // loop
        0x20, 0x04, 0x20, 0x01, 0x4e, 0x0d, 0x01, // if (i >= length) br 1
        // byte = load8_u(offset + i)
        0x20, 0x00, 0x20, 0x04, 0x6a, 0x2d, 0x00, 0x00,
        // sum1 = (sum1 + byte) % 65521
        0x20, 0x02, 0x6a, 0x41, ...encodeSignedLEB128(65521), 0x70, 0x21, 0x02,
        // sum2 = (sum2 + sum1) % 65521
        0x20, 0x03, 0x20, 0x02, 0x6a, 0x41, ...encodeSignedLEB128(65521), 0x70, 0x21, 0x03,
        // i = i + 1
        0x20, 0x04, 0x41, ...encodeSignedLEB128(1), 0x6a, 0x21, 0x04,
        0x0c, 0x00, // br 0 (repeat loop)
      0x0b, // end loop
    0x0b, // end block
    // return (sum2 << 16) | sum1
    0x20, 0x03, 0x41, ...encodeSignedLEB128(16), 0x74, 0x20, 0x02, 0x72,
    0x0b // end func
  ];

  // Func 2: fast_hash(offset: i32, length: i32) -> i32 (FNV-1a 32-bit Hash)
  // Locals: 2 locals (hash=local 2, i=local 3)
  // FNV-1a 32-bit offset basis = -2128831035 (-0x7ee3623b / 0x811c9dc5 as signed i32)
  const func2Body = [
    0x01, 0x02, 0x7f, // 2 locals of i32
    0x41, ...encodeSignedLEB128(-2128831035), 0x21, 0x02, // hash = 0x811c9dc5
    0x41, ...encodeSignedLEB128(0), 0x21, 0x03,           // i = 0
    0x02, 0x40, // block
      0x03, 0x40, // loop
        0x20, 0x03, 0x20, 0x01, 0x4e, 0x0d, 0x01, // if (i >= length) br 1
        // hash = (hash ^ load8_u(offset + i)) * 16777619
        0x20, 0x02, 0x20, 0x00, 0x20, 0x03, 0x6a, 0x2d, 0x00, 0x00, 0x73,
        0x41, ...encodeSignedLEB128(16777619), 0x6c, 0x21, 0x02,
        // i = i + 1
        0x20, 0x03, 0x41, ...encodeSignedLEB128(1), 0x6a, 0x21, 0x03,
        0x0c, 0x00, // br 0
      0x0b, // end loop
    0x0b, // end block
    0x20, 0x02, // return hash
    0x0b // end func
  ];

  // Func 3: get_wasm_version() -> i32 (returns 240 = v2.4)
  const func3Body = [
    0x00, // 0 locals
    0x41, ...encodeSignedLEB128(240),
    0x0b // end func
  ];

  const codePayload = [
    0x04, // 4 functions
    ...encodeUnsignedLEB128(func0Body.length), ...func0Body,
    ...encodeUnsignedLEB128(func1Body.length), ...func1Body,
    ...encodeUnsignedLEB128(func2Body.length), ...func2Body,
    ...encodeUnsignedLEB128(func3Body.length), ...func3Body,
  ];
  const codeSection = createSection(10, codePayload);

  const fullWasm = Buffer.from([
    ...header,
    ...typeSection,
    ...funcSection,
    ...memorySection,
    ...exportSection,
    ...codeSection
  ]);

  return fullWasm;
}

const outDir = path.join(__dirname, '../public/wasm');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const wasmBuffer = createOceanForgeWasm();

// Validate WebAssembly bytecode in V8 engine
try {
  const mod = new WebAssembly.Module(wasmBuffer);
  const inst = new WebAssembly.Instance(mod, {});
  const { encrypt_byte, compute_checksum, fast_hash, get_wasm_version, memory } = inst.exports;

  // Test encrypt_byte
  const encRes = encrypt_byte(65, 42); // 'A' ^ 42
  if (encRes !== (65 ^ 42)) throw new Error(`encrypt_byte failed test: got ${encRes}`);

  // Test memory & compute_checksum & fast_hash
  const memView = new Uint8Array(memory.buffer);
  const testStr = Buffer.from('OceanForge_Wasm_Test_123');
  memView.set(testStr, 0);
  const checksum = compute_checksum(0, testStr.length);
  const hash = fast_hash(0, testStr.length);
  const ver = get_wasm_version();

  console.log(`[Wasm Validator] ✅ Bytecode validation PASSED:`);
  console.log(`  - Version: ${ver / 100}`);
  console.log(`  - Checksum: 0x${checksum.toString(16)}`);
  console.log(`  - FNV1a Hash: 0x${(hash >>> 0).toString(16)}`);
  console.log(`  - Binary Size: ${wasmBuffer.length} bytes`);

  const outPath = path.join(outDir, 'oceanforge_core.wasm');
  fs.writeFileSync(outPath, wasmBuffer);
  console.log(`[Wasm Builder] Output successfully written to: ${outPath}`);
} catch (err) {
  console.error('[Wasm Builder] ❌ Compilation / Validation error:', err);
  process.exit(1);
}
