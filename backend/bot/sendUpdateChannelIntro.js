/**
 * Script to refresh and post an official System Update Welcome Embed in #🚀・cập-nhật-hệ-thống
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

async function sendUpdateChannelIntro() {
  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const updateChan = chans.find(c => c.type === 0 && (c.name.includes('cập-nhật') || c.name.includes('update')));

    if (!updateChan) {
      console.log('Không tìm thấy kênh cập nhật hệ thống');
      return;
    }

    // Send a brand new ultra-aesthetic System Update Channel Intro Embed
    await api.post(`/channels/${updateChan.id}/messages`, {
      embeds: [{
        title: '🚀 KÊNH NHẬT KÝ CẬP NHẬT HỆ THỐNG & BẢO TRÌ BẢO DƯỠNG',
        description: 'Đây là kênh chính thức ghi nhận toàn bộ các bản phát hành tính năng mới và thông báo bảo trì từ Ban Quản Trị **OceanForge**!\n',
        color: 0x06B6D4, // Cyan Glow
        author: { name: '✨ OCEANFORGE SYSTEM CHANGELOG' },
        fields: [
          {
            name: '📌 LOẠI THÔNG BÁO SẼ PHÁT TẠI KÊNH NÀY',
            value: '• 🚀 **Cập Nhật Tính Năng Mới (Release Notes)**: Nâng cấp Discord Bot, giao diện Web Dashboard, các tính năng tự động cày game.\n' +
              '• 🛠️ **Thông Báo Bảo Trì (Maintenance Alerts)**: Lịch bảo trì máy chủ, tối ưu cơ sở dữ liệu (tự động tag `@everyone`).\n' +
              '• ⚡ **Bản Vá Lỗi (Hotfixes)**: Nhật ký sửa các lỗi nhỏ được báo cáo từ cộng đồng.',
            inline: false
          },
          {
            name: '🔒 QUYỀN TRUY CẬP',
            value: '• Kênh này được **Khóa quyền gửi tin nhắn (Read-Only)** đối với thành viên thường để đảm bảo không bị trôi tin tức quan trọng.\n' +
              '• Chỉ Admin / Bot mới có quyền đẩy thông báo trực tiếp từ **Web Dashboard**.',
            inline: false
          }
        ],
        footer: { text: '🛡️ OceanForge SaaS Client • Live Changelog System' },
        timestamp: new Date().toISOString()
      }]
    });

    console.log('✅ Đã gửi Thẻ Giới Thiệu Kênh Cập Nhật Hệ Thống siêu đẹp!');
  } catch (err) {
    console.error('Lỗi gửi tin nhắn:', err.response?.data || err.message);
  }
}

sendUpdateChannelIntro();
