/**
 * Script to send an ultra-aesthetic System Alert & Realtime Monitoring Intro into #🏴‍☠️・cảnh-báo-tài-khoản
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

async function sendAlertChannelOverview() {
  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const alertChan = chans.find(c => c.type === 0 && (c.name.includes('cảnh-báo') || c.name.includes('alert')));

    if (!alertChan) {
      console.log('Không tìm thấy kênh cảnh báo tài khoản');
      return;
    }

    // 1. Send Main System Overview Embed
    await api.post(`/channels/${alertChan.id}/messages`, {
      embeds: [{
        title: '🚨 KÊNH GIÁM SÁT REALTIME & CẢNH BÁO TỰ ĐỘNG (SYSTEM MONITOR)',
        description: 'Kênh này được kết nối trực tiếp với **Hệ Thống Giám Sát Realtime 24/7**. Bot sẽ tự động quét và phát thông báo khẩn cấp khi phát hiện sự cố trên các tài khoản Roblox của bạn:\n',
        color: 0xEF4444, // Red Glow
        author: { name: '✨ OCEANFORGE AUTOMATED ALERT ENGINE' },
        fields: [
          {
            name: '🔴 1. CẢNH BÁO VĂNG GAME / MẤT KẾT NỐI (DISCONNECTED)',
            value: '• Tự động phát thẻ tin nhắn màu Đỏ kèm tag tên khi tài khoản bị đứt kết nối hoặc không gửi dữ liệu quá **15 phút**.',
            inline: false
          },
          {
            name: '🟡 2. CẢNH BÁO MẠNG LAG / ĐANG KẾT NỐI LẠI (RECONNECTING)',
            value: '• Tự động phát thẻ màu Vàng Cam khi độ trễ ping cao hoặc game đang trong trạng thái tự vào lại máy chủ.',
            inline: false
          },
          {
            name: '🔑 3. CẢNH BÁO API KEY VÀ SECURITY LOGS',
            value: '• Phát thông báo khi API Key của tài khoản bị thay đổi, hết hạn hoặc phát hiện truy cập bất thường.',
            inline: false
          },
          {
            name: '🟢 4. THÔNG BÁO TÀI KHOẢN KHÔI PHỤC (ONLINE RECOVERED)',
            value: '• Tự động phát thẻ màu Xanh Ngọc khi tài khoản văng game đã tự đăng nhập lại thành công!',
            inline: false
          }
        ],
        footer: { text: '🛡️ OceanForge Realtime Sentinel • Tự Động Giám Sát 24/7' },
        timestamp: new Date().toISOString()
      }]
    });

    // 2. Send Sample Realtime Alert Demo Embed
    await api.post(`/channels/${alertChan.id}/messages`, {
      embeds: [{
        title: '⚠️ DEMO CẢNH BÁO: TÀI KHOẢN MẤT KẾT NỐI (SAMPLE ALERT)',
        description: '🚨 **Phát Hiện Sự Cố:** Tài khoản **`Player_Demo01`** đã ngừng gửi dữ liệu quá 15 phút!',
        color: 0xEF4444,
        fields: [
          { name: '🎮 Tài Khoản', value: '`Player_Demo01`', inline: true },
          { name: '⚔️ Level', value: '`2550` (Third Sea)', inline: true },
          { name: '⚡ Trạng Thái', value: '🔴 **Offline / Disconnected**', inline: true },
          { name: '⏱️ Thời Gian Ngắt', value: new Date().toLocaleTimeString('vi-VN'), inline: true },
          { name: '📌 Khuyến Nghị', value: 'Vui lòng kiểm tra lại phần mềm Roblox Client hoặc khởi động lại máy cày bot.', inline: false },
        ],
        footer: { text: '🛡️ Mẫu Cảnh Báo Tự Động Realtime' },
        timestamp: new Date().toISOString()
      }]
    });

    console.log('✅ Đã gửi Bảng Giới Thiệu & Mẫu Cảnh Báo Realtime siêu đẹp vào kênh #🏴‍☠️・cảnh-báo-tài-khoản!');
  } catch (err) {
    console.error('Lỗi khi gửi thông báo cảnh báo:', err.response?.data || err.message);
  }
}

sendAlertChannelOverview();
