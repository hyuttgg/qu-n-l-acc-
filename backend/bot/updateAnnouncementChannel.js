/**
 * Script to refresh and post an ultra-aesthetic Announcement Embed in #💻・thông-báo
 */
const axios = require('axios');
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

if (!token) {
  console.log('⚠️ DISCORD_BOT_TOKEN missing');
  process.exit(1);
}

const api = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
});

async function updateOfficialAnnouncement() {
  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const announceChan = chans.find(c => c.type === 0 && (c.name.includes('thông-báo') || c.name.includes('announcement')));

    if (!announceChan) {
      console.log('Không tìm thấy kênh thông báo');
      return;
    }

    // Send a brand new ultra-aesthetic Official Announcement Embed
    const sent = await api.post(`/channels/${announceChan.id}/messages`, {
      embeds: [{
        title: '👑 THÔNG BÁO CHÍNH THỨC TỪ BẢN QUẢN TRỊ OCEANFORGE',
        description: 'Chào mừng tất cả các thành viên đến với **Hệ Thống Quản Lý Tài Khoản Roblox Automation Client**!\n\n' +
          'Máy chủ Discord đã được tự động hóa đồng bộ 100% với Web Dashboard. Dưới đây là các kênh thông tin quan trọng bạn cần nắm rõ:\n',
        color: 0xF59E0B, // Vibrant Gold
        author: { name: '✨ OCEANFORGE OFFICIAL ANNOUNCEMENT' },
        fields: [
          {
            name: '📌 1. KÊNH THÔNG TIN CHÍNH',
            value: '• **`#💻・thông-báo`**: Nơi đăng các thông tin quan trọng từ Admin.\n' +
              '• **`#🚀・cập-nhật-hệ-thống`**: Nhật ký nâng cấp tính năng & thông báo bảo trì Web.\n' +
              '• **`#👋・chào-mừng`**: Gửi lời chào mừng thành viên mới tham gia.',
            inline: false
          },
          {
            name: '🤖 2. KÊNH DISCORD BOT REALTIME',
            value: '• **`#🧬・liên-kết-tài-khoản`**: Gõ lệnh **`/link`** để kết nối với Web Dashboard.\n' +
              '• **`#👾・tra-cứu-hồ-sơ`**: Tra cứu thông số cá nhân qua **`/profile`** & **`/accounts`**.\n' +
              '• **`#📈・thống-kê-chỉ-số`**: Theo dõi chỉ số Online/Offline/Runtime qua **`/stats`** & **`/online`**.\n' +
              '• **`#🔍・tìm-kiếm-acc`**: Tìm kiếm tài khoản nâng cao bằng **`/search`**.',
            inline: false
          },
          {
            name: '⚠️ 3. CẢNH BÁO TỰ ĐỘNG REALTIME',
            value: '• **`#🏴‍☠️・cảnh-báo-tài-khoản`**: Tự động phát cảnh báo khi tài khoản Roblox bị văng game, ngắt kết nối hoặc lag > 15 phút.',
            inline: false
          },
          {
            name: '🔰 4. QUYỀN HẠN THÀNH VIÊN (ROLES)',
            value: '`👑 Owner` • `🟣 Admin` • `🛡️ Moderator` • `🚀 Developer` • `💎 Premium` • `⚡ VIP` • `🟢 Member`',
            inline: false
          }
        ],
        footer: { text: '🛡️ OceanForge SaaS Broadcaster • Cập Nhật Tự Động' },
        timestamp: new Date().toISOString()
      }]
    });

    console.log('✅ Đã gửi lại Thẻ Embed Thông Báo Chính Thức siêu đẹp vào kênh #💻・thông-báo!');
  } catch (err) {
    console.error('Lỗi khi cập nhật thông báo:', err.response?.data || err.message);
  }
}

updateOfficialAnnouncement();
