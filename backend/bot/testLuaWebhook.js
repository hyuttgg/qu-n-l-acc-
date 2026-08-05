const axios = require('axios');

async function testLuaSync() {
  try {
    // 1. Get or create user to get real API Key
    const crypto = require('crypto');
    const apiKey = 'forge_test_' + crypto.randomBytes(8).toString('hex');

    // Create a mock user in backend if db not connected or find existing
    const mockStore = require('../utils/mockStore');
    const user = mockStore.createUser('LuaUserTester', 'lua@tester.com', 'pass123');
    user.apiKey = apiKey;

    console.log(`🔑 Đã tạo User Tester với API Key duy nhất: ${apiKey} (User Code: ${user.userCode})`);

    // 2. Send Roblox Lua Client Telemetry POST Request
    const res = await axios.post('http://localhost:5000/api/webhook/roblox', {
      apiKey: apiKey,
      robloxUsername: 'BloxFruits_Pro_2026',
      level: 2550,
      beli: 45000000,
      fragments: 85000,
      sea: 3,
      fruit: 'Dough (V2)',
      sword: 'Cursed Dual Katana',
      gun: 'Soul Guitar',
      fightingStyle: 'Godhuman',
      race: 'Mink V4',
      status: 'online'
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 KẾT QUẢ ĐỒNG BỘ TỪ ROBLOX LUA:', res.data);
  } catch (err) {
    console.error('❌ LỖI ĐỒNG BỘ LUA:', err.response?.data || err.message);
  }
}

testLuaSync();
