const axios = require('axios');

async function testMaintenance() {
  try {
    const res = await axios.post('http://localhost:5000/api/bot/broadcast', {
      type: 'MAINTENANCE',
      title: '🛠️ NÂNG CẤP MÁY CHỦ DATABASE CƠ SỞ DỮ LIỆU',
      duration: '45 phút',
      content: 'Nâng cấp cụm máy chủ MongoDB & tối ưu hóa tốc độ gửi nhận dữ liệu Roblox client.',
      author: 'System Operator'
    }, {
      headers: {
        'Authorization': 'Bearer oceanforge_bot_secret_2026',
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 KẾT QUẢ MAINTENANCE BROADCAST:', res.data);
  } catch (err) {
    console.error('❌ LỖI:', err.response?.data || err.message);
  }
}

testMaintenance();
