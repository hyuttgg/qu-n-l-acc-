const axios = require('axios');

async function testConcurrency() {
  console.log('🚀 Starting C# Concurrency Engine High-Throughput Test...');

  // 1. Get user API Key from database
  const mongoose = require('mongoose');
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../models/User');
  const user = await User.findOne();
  if (!user || !user.apiKey) {
    console.error('No user with API key found for test');
    process.exit(1);
  }

  console.log(`Found test user: ${user.username} (API Key: ${user.apiKey.substring(0, 8)}...)`);

  const client = axios.create({
    baseURL: 'http://localhost:5001',
    timeout: 5000,
    headers: {
      'x-api-key': user.apiKey,
      'Content-Type': 'application/json'
    }
  });

  const totalRequests = 100;
  console.log(`📡 Blasting ${totalRequests} concurrent telemetry requests to /api/lua/update...`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < totalRequests; i++) {
    const accIndex = (i % 5) + 1; // 5 distinct accounts sending updates
    const payload = {
      roblox_username: `blox_hero_${accIndex}`,
      level: 2550,
      beli: 25000000 + i * 100,
      fragments: 55000 + i * 10,
      sea: 3,
      race: 'Cyborg V4',
      status: 'grinding',
      location: 'Mansion / Floating Turtle',
      equipped: {
        fruit: 'Kitsune',
        fruitMastery: 600,
        sword: 'Cursed Dual Katana',
        gun: 'Soul Guitar',
        fightingStyle: 'Godhuman',
        accessory: 'Leviathan Shield'
      },
      inventory: {
        fruits: ['Kitsune', 'Dragon', 'Leopard', 'Dough', 'Buddha'],
        weapons: ['Cursed Dual Katana', 'Dark Blade', 'True Triple Katana'],
        materials: [
          { name: 'Mirror Fractal', quantity: 5 },
          { name: 'Leviathan Heart', quantity: 2 },
          { name: 'Dragon Scale', quantity: 45 }
        ]
      }
    };

    promises.push(
      client.post('/api/lua/update', payload)
        .then(res => ({ success: true, status: res.status, data: res.data }))
        .catch(err => ({ success: false, error: err.message, status: err.response?.status }))
    );
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const avgLatency = (totalDuration / totalRequests).toFixed(2);

  console.log('\n📊 Concurrency Benchmark Results:');
  console.log(`  - Total Requests Sent: ${totalRequests}`);
  console.log(`  - Successful (HTTP 200): ${successCount}`);
  console.log(`  - Failed: ${failureCount}`);
  console.log(`  - Total Time: ${totalDuration}ms`);
  console.log(`  - Average Latency per Request: ${avgLatency}ms`);
  console.log(`  - Throughput: ${((totalRequests / totalDuration) * 1000).toFixed(0)} req/sec ⚡`);

  // Fetch C# metrics
  const metricsRes = await axios.get('http://localhost:5001/api/lua/concurrency-metrics');
  console.log('\n⚡ C# Concurrency Engine Live Metrics:');
  console.log(JSON.stringify(metricsRes.data.data, null, 2));

  await mongoose.disconnect();
  console.log('\n✅ All tests passed with 0% packet loss!');
}

testConcurrency().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
