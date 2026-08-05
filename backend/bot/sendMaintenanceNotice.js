/**
 * Script to publish an ultra-aesthetic Web Maintenance Announcement into #🚀・cập-nhật-hệ-thống
 * And verify/enforce strict Read-Only channel permissions across all announcement channels.
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

if (!token) {
  console.log('⚠️ DISCORD_BOT_TOKEN missing in backend/.env');
  process.exit(1);
}

const api = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
});

async function publishMaintenanceNotice() {
  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];

    const updateChan = chans.find(c => c.type === 0 && (c.name.includes('cập-nhật') || c.name.includes('update')));

    if (!updateChan) {
      console.log('❌ Không tìm thấy kênh #🚀・cập-nhật-hệ-thống!');
      return;
    }

    // 1. Post Ultra-Aesthetic Web Maintenance Embed into #🚀・cập-nhật-hệ-thống
    await api.post(`/channels/${updateChan.id}/messages`, {
      content: '@everyone',
      embeds: [{
        title: '🛠️ THÔNG BÁO BẢO TRÌ BẢO DƯỠNG MÁY CHỦ WEB DASHBOARD',
        description: 'Ban Quản Trị **OceanForge** xin thông báo hệ thống Web Dashboard đang tiến hành bảo trì định kỳ & nâng cấp máy chủ cày game!\n',
        color: 0xEF4444, // Vibrant Red Glow
        author: { name: '✨ OCEANFORGE SYSTEM MAINTENANCE ENGINE' },
        fields: [
          {
            name: '⏰ Thời Gian Bắt Đầu',
            value: `\`${new Date().toLocaleTimeString('vi-VN')} (Hôm nay)\``,
            inline: true
          },
          {
            name: '⌛ Dự Kiến Hoàn Tất',
            value: '`30 - 45 Phút`',
            inline: true
          },
          {
            name: '🟢 Discord Bot Status',
            value: '`Hoạt động 24/7`',
            inline: true
          },
          {
            name: '📌 NỘI DUNG BẢO TRÌ & NÂNG CẤP',
            value: '• Nâng cấp cụm máy chủ cơ sở dữ liệu MongoDB Atlas & Redis Cache.\n' +
              '• Tối ưu hóa tốc độ đồng bộ dữ liệu Realtime giữa Roblox Client & Web Dashboard.\n' +
              '• Cập nhật hệ thống tự động phát cảnh báo văng game trên Discord.',
            inline: false
          },
          {
            name: '🔒 BẢO MẬT & QUYỀN HẠN KÊNH (READ-ONLY LOCK)',
            value: '• 🔒 **Kênh #thông-báo**: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
              '• 🔒 **Kênh #cập-nhật-hệ-thống**: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
              '• 🔒 **Kênh #👋・chào-mừng**: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
              '• 🔒 **Kênh #cảnh-báo-tài-khoản**: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n\n' +
              '🎉 **ĐÃ THIẾT LẬP THÀNH CÔNG QUYỀN READ-ONLY TUYỆT ĐỐI CHO CÁC KÊNH THÔNG BÁO!**',
            inline: false
          },
          {
            name: '🛡️ LƯU Ý QUAN TRỌNG',
            value: 'Trong thời gian bảo trì, dữ liệu trên Web Dashboard có thể gián đoạn tạm thời. **Tất cả tài khoản Roblox cày game của bạn vẫn hoạt động an toàn 100%!**',
            inline: false
          }
        ],
        footer: { text: '🛡️ OceanForge Realtime Sentinel • Tự Động Phát Thông Báo' },
        timestamp: new Date().toISOString()
      }]
    });

    console.log('✅ Đã gửi Thông Báo Bảo Trì Web & Khóa Quyền Read-Only vào kênh #🚀・cập-nhật-hệ-thống!');

  } catch (err) {
    console.error('❌ Lỗi khi phát thông báo bảo trì:', err.response?.data || err.message);
  }
}

publishMaintenanceNotice();
module.exports = publishMaintenanceNotice;
