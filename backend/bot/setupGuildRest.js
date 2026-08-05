/**
 * Pure REST API Discord Guild Setup Script (using Axios)
 * Automatically creates Roles, Categories, Text Channels, Slash Commands, and Announcement Embeds.
 * 
 * Usage:
 * DISCORD_BOT_TOKEN=your_token node backend/bot/setupGuildRest.js
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID || '1527320103476269076';
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

if (!token) {
  console.log('\n⚠️ [CẢNH BÁO]: Chưa có DISCORD_BOT_TOKEN trong file backend/.env!');
  console.log(`📌 ID Server Discord đã ghi nhận: ${guildId}`);
  console.log('\nVui lòng gửi mã Bot Token từ Discord Developer Portal (hoặc dán vào file backend/.env):');
  console.log('DISCORD_BOT_TOKEN=your_token_here\n');
  process.exit(1);
}

const api = axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    'Authorization': `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Roles definition
const ROLES = [
  { name: '👑 Owner', color: 0xF59E0B },
  { name: '🟣 Admin', color: 0xA855F7 },
  { name: '🛡️ Moderator', color: 0x06B6D4 },
  { name: '🚀 Developer', color: 0xEC4899 },
  { name: '💎 Premium', color: 0x0EA5E9 },
  { name: '⚡ VIP', color: 0xF97316 },
  { name: '🟢 Member', color: 0x10B981 },
];

// Structure of Categories and Channels with rich aesthetic Discord icons (👋, 💻, 📈, 🧬, 👾, 🏴‍☠️, 🚀, 💬, 🛠️)
const STRUCTURE = [
  {
    category: '📢│THÔNG BÁO HỆ THỐNG',
    channels: [
      { name: '👋・chào-mừng', topic: 'Kênh gửi lời chào mừng thành viên mới tham gia Máy chủ' },
      { name: '💻・thông-báo', topic: 'Kênh thông báo chính thức từ Admin' },
      { name: '🚀・cập-nhật-hệ-thống', topic: 'Nhật ký nâng cấp tính năng Web Dashboard & Discord Bot' }
    ]
  },
  {
    category: '🤖│LỆNH DISCORD BOT',
    channels: [
      { name: '🧬・liên-kết-tài-khoản', topic: 'Gõ /link để lấy mã xác thực liên kết tài khoản Discord với Website' },
      { name: '👾・tra-cứu-hồ-sơ', topic: 'Dùng lệnh /profile, /accounts, /account để xem thông tin' },
      { name: '📈・thống-kê-chỉ-số', topic: 'Dùng lệnh /online, /stats, /runtime để theo dõi hệ thống' },
      { name: '🔍・tìm-kiếm-acc', topic: 'Dùng lệnh /search, /logs, /history để tra cứu nâng cao' }
    ]
  },
  {
    category: '⚠️│CẢNH BÁO TỰ ĐỘNG',
    channels: [
      { name: '🏴‍☠️・cảnh-báo-tài-khoản', topic: 'Kênh tự động phát cảnh báo khi tài khoản Roblox lag hoặc mất kết nối' }
    ]
  },
  {
    category: '💬│THẢO LUẬN CHUNG',
    channels: [
      { name: '💬・trò-chuyện-chung', topic: 'Kênh giao lưu thành viên' },
      { name: '🛠️・hỗ-trợ-kỹ-thuật', topic: 'Hỏi đáp kỹ thuật & báo lỗi' }
    ]
  }
];

const SLASH_COMMANDS = [
  { name: 'link', description: '🧬 Tạo mã liên kết tài khoản Discord với Website Dashboard' },
  { name: 'profile', description: '👾 Xem thông tin User Identity, Role, và thống kê số tài khoản' },
  { name: 'accounts', description: '📜 Xem danh sách các tài khoản Roblox của bạn' },
  { 
    name: 'account', 
    description: '🎮 Xem chi tiết thông số của 1 tài khoản Roblox (Level, Beli, Fruits, Runtime)',
    options: [{ name: 'username', description: 'Tên tài khoản Roblox', type: 3, required: true }]
  },
  { name: 'online', description: '🌐 Xem tình trạng Online / Offline / Updating' },
  { name: 'runtime', description: '⏱️ Xem tổng thời gian chạy bot của từng tài khoản' },
  { name: 'stats', description: '📊 Xem tổng số Beli, Fragments và chỉ số chung' },
  { name: 'apikey', description: '🔑 Kiểm tra & Lấy API Key kết nối Lua Script với Bot Discord' },
  { name: 'createkey', description: '🔑 Tạo mới mã API Key cá nhân duy nhất để dán vào Roblox Lua Client' },
  { name: 'deletekey', description: '🗑️ Xóa mã API Key cá nhân hiện tại' },
  { 
    name: 'history', 
    description: '📜 Xem lịch sử trạng thái Online của 1 tài khoản',
    options: [{ name: 'username', description: 'Tên tài khoản Roblox', type: 3, required: true }]
  },
  { 
    name: 'search', 
    description: '🔍 Tìm kiếm tài khoản theo chỉ số / trái quỷ / sea',
    options: [{ name: 'query', description: 'Từ khóa tìm kiếm', type: 3, required: false }]
  },
  { 
    name: 'logs', 
    description: '📋 Xem nhật ký hoạt động gần đây của tài khoản',
    options: [{ name: 'username', description: 'Tên tài khoản Roblox', type: 3, required: true }]
  },
  { 
    name: 'admin', 
    description: '👑 (Admin) Quản lý hệ thống người dùng và tài khoản',
    options: [{ name: 'username', description: 'Tên tài khoản Roblox (tùy chọn)', type: 3, required: false }]
  },
  { name: 'help', description: '🤖 Hiển thị tất cả lệnh hỗ trợ & phân bổ kênh Discord' }
];

async function runSetup() {
  try {
    const meRes = await api.get('/users/@me');
    console.log(`🤖 Đã kết nối thành công tới Bot: ${meRes.data.username} (ID: ${meRes.data.id})`);

    let targetGuild = null;
    try {
      const gRes = await api.get(`/guilds/${guildId}`);
      targetGuild = gRes.data;
    } catch (e) {
      console.log(`⚠️ Bot chưa tham gia trực tiếp vào Server ID ${guildId}.`);
    }

    if (!targetGuild) {
      const myGuildsRes = await api.get('/users/@me/guilds');
      const myGuilds = myGuildsRes.data || [];
      console.log(`📡 Các Server Bot đã tham gia (${myGuilds.length}):`);
      myGuilds.forEach(g => console.log(`  - [${g.name}] (ID: ${g.id})`));

      if (myGuilds.length > 0) {
        targetGuild = myGuilds[0];
        console.log(`👉 Chọn Server: "${targetGuild.name}" (ID: ${targetGuild.id})`);
      } else {
        console.log('\n❌ Bot chưa tham gia vào Server Discord nào!');
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
        console.log(`\n👉 HÃY NHẤN VÀO LIÊN KẾT NÀY ĐỂ MỜI BOT VÀO SERVER CỦA BẠN:\n${inviteUrl}\n`);
        process.exit(1);
      }
    }

    const activeGuildId = targetGuild.id;
    console.log(`\n🚀 Đang tự động tạo Roles, Channels & Slash Commands cho Server "${targetGuild.name}"...`);

    // 1. Deploy Slash Commands
    console.log('\n⏳ Đang đăng ký 13 Lệnh Slash Commands...');
    await api.put(`/applications/${clientId}/guilds/${guildId}/commands`, SLASH_COMMANDS);
    console.log('✅ Đã đăng ký Slash Commands thành công!');

    // 2. Create Roles
    console.log('\n⏳ Đang tự động khởi tạo các Vai trò (Roles)...');
    const existingRolesRes = await api.get(`/guilds/${guildId}/roles`);
    const existingRoles = existingRolesRes.data || [];

    for (const rDef of ROLES) {
      const found = existingRoles.find(r => r.name === rDef.name);
      if (!found) {
        try {
          await api.post(`/guilds/${guildId}/roles`, {
            name: rDef.name,
            color: rDef.color,
            hoist: true,
          });
          console.log(`  + Đã tạo Role: ${rDef.name}`);
        } catch (e) {
          console.error(`  - Không thể tạo Role ${rDef.name}:`, e.response?.data?.message || e.message);
        }
      } else {
        console.log(`  = Role đã tồn tại: ${rDef.name}`);
      }
    }

    // 3. Create Categories & Channels
    console.log('\n⏳ Đang tự động khởi tạo Danh mục & Kênh chữ...');
    const existingChansRes = await api.get(`/guilds/${guildId}/channels`);
    const existingChans = existingChansRes.data || [];

    for (const catDef of STRUCTURE) {
      let catObj = existingChans.find(c => c.type === 4 && c.name === catDef.category);
      if (!catObj) {
        try {
          const res = await api.post(`/guilds/${guildId}/channels`, {
            name: catDef.category,
            type: 4, // GUILD_CATEGORY
          });
          catObj = res.data;
          console.log(`  📂 Đã tạo Danh mục: ${catDef.category}`);
        } catch (e) {
          console.error(`  - Lỗi tạo danh mục ${catDef.category}:`, e.response?.data?.message || e.message);
        }
      }

      for (const chDef of catDef.channels) {
        const foundChan = existingChans.find(c => c.type === 0 && c.name === chDef.name);
        if (!foundChan) {
          try {
            const isReadOnly = ['thông-báo', 'cập-nhật', 'chào-mừng', 'cảnh-báo'].some(k => chDef.name.includes(k));
            const permissionOverwrites = isReadOnly ? [
              {
                id: activeGuildId, // @everyone role
                type: 0,
                allow: '0',
                deny: '2048' // DENY SEND_MESSAGES
              }
            ] : [];

            const res = await api.post(`/guilds/${activeGuildId}/channels`, {
              name: chDef.name,
              type: 0, // GUILD_TEXT
              parent_id: catObj ? catObj.id : null,
              topic: chDef.topic,
              permission_overwrites: permissionOverwrites
            });
            const chanObj = res.data;
            console.log(`    # Đã tạo Kênh: #${chDef.name} ${isReadOnly ? '(🔒 Read-Only)' : ''}`);

            // Send Embed Welcome Msg
            if (chDef.name.includes('liên-kết-tài-khoản')) {
              await api.post(`/channels/${chanObj.id}/messages`, {
                embeds: [{
                  title: '🧬 HƯỚNG DẪN LIÊN KẾT TÀI KHOẢN DISCORD VỚI WEB DASHBOARD',
                  description: 'Để liên kết tài khoản Discord của bạn với hệ thống Quản Lý Tài Khoản:\n\n' +
                    '1. Gõ lệnh **`/link`** ngay tại kênh này.\n' +
                    '2. Bot sẽ gửi cho bạn **Mã Xác Thực** 6 ký tự (có hiệu lực trong 5 phút).\n' +
                    '3. Mở **Web Dashboard** ➔ Nhập mã xác nhận để hoàn tất liên kết!\n\n' +
                    '✨ Sau khi liên kết, bạn có thể tra cứu thông số tài khoản Roblox trực tiếp trên Discord!',
                  color: 0x06B6D4
                }]
              });
            }

            if (chDef.name.includes('thông-báo')) {
              await api.post(`/channels/${chanObj.id}/messages`, {
                embeds: [{
                  title: '💻 CHÀO MỪNG BẠN ĐẾN VỚI HỆ THỐNG OCEANFORGE BOT',
                  description: 'Hệ thống Discord Server đã được tự động cấu hình hoàn chỉnh với giao diện Icon cao cấp!\n\n' +
                    '• **💻 Kênh Thông Báo:** Cập nhật tin tức Admin & nhật ký hệ thống\n' +
                    '• **🧬 Kênh Lệnh Bot:** Tra cứu thông số, kiểm tra status, runtime (/profile, /stats, /accounts)\n' +
                    '• **🏴‍☠️ Kênh Cảnh Báo:** Tự động phát thông báo khi tài khoản ngắt kết nối\n' +
                    '• **🟢 Phân Quyền Roles:** Đồng bộ 100% với hệ thống Web Identity\n',
                  color: 0xF59E0B
                }]
              });
            }

          } catch (e) {
            console.error(`    - Lỗi tạo kênh #${chDef.name}:`, e.response?.data?.message || e.message);
          }
        } else {
          console.log(`    = Kênh đã tồn tại: #${chDef.name}`);
        }
      }
    }

    console.log('\n🎉 TỰ ĐỘNG CẤU HÌNH SERVER DISCORD HOÀN TẤT!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Lỗi kết nối Discord API:', err.response?.data || err.message);
    process.exit(1);
  }
}

runSetup();
