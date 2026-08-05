/**
 * Script to publish ultra-aesthetic feature guides & introductory embeds into the 4 Discord Bot channels:
 * 1. #🧬・liên-kết-tài-khoản
 * 2. #👾・tra-cứu-hồ-sơ
 * 3. #📈・thống-kê-chỉ-số
 * 4. #🔍・tìm-kiếm-acc
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

async function publishBotCommandsChannelIntros() {
  try {
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];

    const linkChan = chans.find(c => c.type === 0 && c.name.includes('liên-kết-tài-khoản'));
    const profileChan = chans.find(c => c.type === 0 && c.name.includes('tra-cứu-hồ-sơ'));
    const statsChan = chans.find(c => c.type === 0 && c.name.includes('thống-kê-chỉ-số'));
    const searchChan = chans.find(c => c.type === 0 && c.name.includes('tìm-kiếm-acc'));

    // 1. Channel #🧬・liên-kết-tài-khoản
    if (linkChan) {
      await api.post(`/channels/${linkChan.id}/messages`, {
        embeds: [{
          title: '🧬 HƯỚNG DẪN LIÊN KẾT TÀI KHOẢN DISCORD VỚI WEB DASHBOARD',
          description: 'Chào mừng bạn đến với kênh **Liên Kết Tài Khoản**! Tại đây, bạn có thể tạo mã xác thực để đồng bộ thông tin Discord với Web Dashboard OceanForge.\n\n' +
            '📌 **CÁC BƯỚC THỰC HIỆN:**\n' +
            '1️⃣ Gõ lệnh **`/link`** (hoặc nhắn **`link`**) ngay tại kênh này.\n' +
            '2️⃣ Bot sẽ gửi cho bạn **Mã Xác Thực 6 Ký Tự** (ví dụ: `A8F9-2K4P`).\n' +
            '3️⃣ Truy cập Web Dashboard ➔ **Cài Đặt (Settings)** ➔ Nhập mã xác nhận để hoàn tất!\n\n' +
            '✨ *Sau khi liên kết, tất cả các tài khoản Roblox của bạn sẽ tự động đồng bộ lên Discord Bot!*',
          color: 0x3B82F6, // Bright Blue
          author: { name: '✨ OCEANFORGE ACCOUNT SYNC ENGINE' },
          fields: [
            { name: '⚡ Lệnh Nhanh', value: '` /link ` hoặc ` link `', inline: true },
            { name: '⏰ Thời Gian Mã', value: '`5 Phút`', inline: true },
            { name: '🛡️ Bảo Mật', value: '`Được Mã Hóa 100%`', inline: true }
          ],
          footer: { text: '🛡️ Kênh Liên Kết Tài Khoản • OceanForge Account Manager' },
          timestamp: new Date().toISOString()
        }]
      });
      console.log('✅ Đã đăng Guide Embed vào kênh #🧬・liên-kết-tài-khoản!');
    }

    // 2. Channel #👾・tra-cứu-hồ-sơ
    if (profileChan) {
      await api.post(`/channels/${profileChan.id}/messages`, {
        embeds: [{
          title: '👾 KÊNH TRA CỨU HỒ SƠ IDENTITY & TÀI KHOẢN ROBLOX',
          description: 'Kênh này dành riêng cho việc kiểm tra thông tin cá nhân, danh sách tài khoản Roblox và thông số API Key của bạn!\n\n' +
            '📌 **DANH SÁCH LỆNH KHUYÊN DÙNG:**\n' +
            '• **`/profile`** (hoặc `profile`): Xem thông tin User Identity, Role, User Code & tổng số tài khoản.\n' +
            '• **`/accounts`** (hoặc `accounts`): Xem danh sách các tài khoản Roblox của bạn (phân trang).\n' +
            '• **`/account <username>`** (hoặc `account Player1`): Xem chi tiết Level, Beli, Fragments, Trái quỷ, Kiếm, Thế võ.\n' +
            '• **`/apikey`** (hoặc `apikey`): Kiểm tra trạng thái API Key & mã Lua Script để dán vào Executor.\n' +
            '• **`/createkey`**: Tạo mới API Key cá nhân duy nhất.',
          color: 0x06B6D4, // Cyan Glow
          author: { name: '✨ OCEANFORGE PROFILE & IDENTITY MANAGER' },
          fields: [
            { name: '👤 Hồ Sơ Cá Nhân', value: '`/profile`', inline: true },
            { name: '📜 Danh Sách Acc', value: '`/accounts`', inline: true },
            { name: '🎮 Chi Tiết Acc', value: '`/account <tên_acc>`', inline: true }
          ],
          footer: { text: '🛡️ Kênh Tra Cứu Hồ Sơ • OceanForge Account Manager' },
          timestamp: new Date().toISOString()
        }]
      });
      console.log('✅ Đã đăng Guide Embed vào kênh #👾・tra-cứu-hồ-sơ!');
    }

    // 3. Channel #📈・thống-kê-chỉ-số
    if (statsChan) {
      await api.post(`/channels/${statsChan.id}/messages`, {
        embeds: [{
          title: '📈 KÊNH THỐNG KÊ CHỈ SỐ & BẢNG MONITOR TRỰC TUYẾN',
          description: 'Kênh này giúp bạn theo dõi tổng quan hiệu suất cày game, tình trạng Online/Offline và Runtime của toàn đội tài khoản!\n\n' +
            '📌 **DANH SÁCH LỆNH KHUYÊN DÙNG:**\n' +
            '• **`/online`** (hoặc `online`): Xem tổng số tài khoản đang Trực tuyến (Online), Ngoại tuyến (Offline), hoặc Lag.\n' +
            '• **`/stats`** (hoặc `stats`): Bảng tổng hợp tổng số Beli, Fragments và thời gian cày bot trung bình.\n' +
            '• **`/runtime`** (hoặc `runtime`): Danh sách chi tiết thời gian chạy bot của từng tài khoản Roblox.',
          color: 0x10B981, // Emerald Green
          author: { name: '✨ OCEANFORGE ANALYTICS & MONITOR ENGINE' },
          fields: [
            { name: '🌐 Trực Tuyến', value: '`/online`', inline: true },
            { name: '📊 Tổng Thống Kê', value: '`/stats`', inline: true },
            { name: '⏱️ Thời Gian Chạy', value: '`/runtime`', inline: true }
          ],
          footer: { text: '🛡️ Kênh Thống Kê Chỉ Số • OceanForge Account Manager' },
          timestamp: new Date().toISOString()
        }]
      });
      console.log('✅ Đã đăng Guide Embed vào kênh #📈・thống-kê-chỉ-số!');
    }

    // 4. Channel #🔍・tìm-kiếm-acc
    if (searchChan) {
      await api.post(`/channels/${searchChan.id}/messages`, {
        embeds: [{
          title: '🔍 KÊNH TÌM KIẾM & XEM LỊCH SỬ TÀI KHOẢN NÂNG CAO',
          description: 'Kênh này hỗ trợ tìm kiếm tài khoản theo chỉ số, lọc theo Trái Quỷ/Sea và tra cứu nhật ký hoạt động chi tiết!\n\n' +
            '📌 **DANH SÁCH LỆNH KHUYÊN DÙNG:**\n' +
            '• **`/search <từ_khóa>`** (hoặc `search Dragon`): Tìm kiếm tài khoản theo tên, trái quỷ, sea, level.\n' +
            '• **`/history <username>`** (hoặc `history Player1`): Xem lịch sử mốc thời gian Online/Offline gần đây.\n' +
            '• **`/logs <username>`** (hoặc `logs Player1`): Xem nhật ký hành động (Login, Drop Item, Upgrade).',
          color: 0xF59E0B, // Vibrant Amber
          author: { name: '✨ OCEANFORGE ADVANCED SEARCH ENGINE' },
          fields: [
            { name: '🔍 Tìm Kiếm', value: '`/search <từ_khóa>`', inline: true },
            { name: '📜 Lịch Sử Status', value: '`/history <tên_acc>`', inline: true },
            { name: '📋 Nhật Ký Log', value: '`/logs <tên_acc>`', inline: true }
          ],
          footer: { text: '🛡️ Kênh Tìm Kiếm & Nhật Ký • OceanForge Account Manager' },
          timestamp: new Date().toISOString()
        }]
      });
      console.log('✅ Đã đăng Guide Embed vào kênh #🔍・tìm-kiếm-acc!');
    }

    console.log('🎉 Đã hoàn tất đăng bài giới thiệu tính năng cho cả 4 kênh!');

  } catch (err) {
    console.error('❌ Lỗi khi đăng bài kênh bot:', err.response?.data || err.message);
  }
}

publishBotCommandsChannelIntros();
module.exports = publishBotCommandsChannelIntros;
