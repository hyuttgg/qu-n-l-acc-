const axios = require('axios');

async function testBroadcast() {
  try {
    const res = await axios.post('http://localhost:5000/api/bot/broadcast', {
      type: 'UPDATE',
      version: 'v2.5.0',
      content: '• Tự động gửi tin nhắn chào mừng thành viên mới vào kênh #👋・chào-mừng.\n• Thêm bộ Emoji cao cấp cho tất cả các Danh mục & Kênh chữ.\n• Tích hợp tính năng phát thông báo Bảo Trì & Nâng Cấp Hệ Thống Realtime.',
      author: 'Owner Admin'
    }, {
      headers: {
        'Authorization': 'Bearer oceanforge_bot_secret_2026',
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 KẾT QUẢ BROADCAST:', res.data);
  } catch (err) {
    console.error('❌ LỖI BROADCAST:', err.response?.data || err.message);
  }
}

testBroadcast();
