const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const telemetryQueue = require('../services/telemetryQueue');
const cacheManager = require('../utils/cacheManager');

async function runBenchmark() {
  console.log('🚀 Starting OceanForge Non-Blocking Telemetry Benchmark...');

  const mockUser = {
    _id: '65e9f1a2b3c4d5e6f7a8b9c0',
    username: 'benchmark_user',
    email: 'bench@oceanforge.io'
  };

  const iterations = 500;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const payload = {
      username: `RobloxAcc_${i % 10}`,
      level: 2550 + (i % 50),
      beli: 1000000 + i * 500,
      fragments: 50000 + i * 10,
      sea: 3,
      race: 'Cyborg v4',
      status: 'grinding',
      location: 'Tiki Outpost',
      fruit: 'Kitsune',
      sword: 'Cursed Dual Katana',
      gun: 'Soul Guitar',
      fighting_style: 'Godhuman',
      inventory: {
        fruits: ['Kitsune', 'Dragon', 'Leopard'],
        swords: ['Cursed Dual Katana', 'Dark Blade'],
        guns: ['Soul Guitar'],
        styles: ['Godhuman'],
        materials: [{ name: 'Dragon Scale', quantity: 20 }]
      }
    };

    // Fast-path enqueue
    await telemetryQueue.enqueueUpdate(mockUser, payload, null);
  }

  const durationMs = Date.now() - startTime;
  const avgLatencyMs = (durationMs / iterations).toFixed(2);
  const rps = ((iterations / durationMs) * 1000).toFixed(0);

  console.log(`\n✅ BENCHMARK RESULTS:`);
  console.log(`- Total Requests Ingested: ${iterations}`);
  console.log(`- Total Time Taken: ${durationMs} ms`);
  console.log(`- Average Fast-Path Latency: ${avgLatencyMs} ms per request`);
  console.log(`- Throughput: ${rps} requests/second`);

  // Force flush to test background queue persistence
  console.log('\n⏳ Flushing telemetry queue to background store...');
  const flushStart = Date.now();
  await telemetryQueue.flush();
  console.log(`✅ Queue flushed successfully in ${Date.now() - flushStart} ms!`);

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('❌ Benchmark error:', err);
  process.exit(1);
});
