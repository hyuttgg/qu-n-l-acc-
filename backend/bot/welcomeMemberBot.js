/**
 * Discord Bot Automated Welcome Member Handler
 * Automatically sends ultra-aesthetic 👋 Welcome Embed when new users join the Discord Server
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

const api = token ? axios.create({
  baseURL: 'https://discord.com/api/v10',
  headers: {
    Authorization: `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  },
}) : null;

/**
 * Send Automated 👋 Welcome Greeting Message to #👋・chào-mừng Channel
 * @param {object} member - Discord Guild Member Object (user id, username, avatar, etc.)
 */
async function sendWelcomeGreeting(member) {
  if (!api || !member) return;

  const userId = member.user?.id || member.id;
  const username = member.user?.username || member.username || 'Thành Viên Mới';
  const avatar = member.user?.avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  try {
    // 1. Fetch channels list of the server
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];

    // Target #👋・chào-mừng or #chào-mừng or #welcome
    let welcomeChan = chans.find(c => c.type === 0 && (c.name.includes('chào-mừng') || c.name.includes('welcome')));

    if (!welcomeChan) {
      console.log('⚠️ Không tìm thấy kênh #👋・chào-mừng để gửi lời chào');
      return;
    }

    // 2. Construct Ultra-Aesthetic 👋 Welcome Embed
    const welcomePayload = {
      content: `👋 **Xin chào <@${userId}>! Chào mừng bạn đã gia nhập Máy Chủ OceanForge!** 🎉`,
      embeds: [{
        title: `👋 CHÀO MỪNG ${username.toUpperCase()} ĐÃ ĐẾN VỚI OCEANFORGE!`,
        description: `Chào mừng bạn đến với cộng đồng **OceanForge Blox Fruits Account Manager**! Chúng tôi rất vui mừng khi có sự góp mặt của bạn!\n`,
        color: 0xEAB308, // Royal Gold
        thumbnail: { url: avatar },
        author: { name: '✨ OCEANFORGE WELCOME BOT' },
        fields: [
          { 
            name: '🧬 1. Liên Kết Tài Khoản Web Dashboard', 
            value: 'Hãy vào kênh **#🧬・liên-kết-tài-khoản** và gõ lệnh **`/link`** để kết nối tài khoản Discord với Dashboard.', 
            inline: false 
          },
          { 
            name: '👾 2. Tra Cứu Chỉ Số & Lệnh Bot', 
            value: 'Vào kênh **#👾・tra-cứu-hồ-sơ** gõ **`/help`** hoặc **`/profile`** để kiểm tra tài khoản Roblox của bạn.', 
            inline: false 
          },
          { 
            name: '🌐 3. Truy Cập Web Dashboard', 
            value: '👉 Web chính thức: [manageblox.io.vn](https://manageblox.io.vn)', 
            inline: false 
          }
        ],
        footer: { text: '🛡️ Chúc bạn có trải nghiệm tuyệt vời cùng OceanForge!' },
        timestamp: new Date().toISOString()
      }]
    };

    // 3. Send message to #👋・chào-mừng
    await api.post(`/channels/${welcomeChan.id}/messages`, welcomePayload);
    console.log(`👋 [WELCOME BOT]: Đã gửi lời chào xin chào bạn mới cho ${username} (<@${userId}>) tại kênh #${welcomeChan.name}`);

  } catch (err) {
    console.error('❌ Lỗi khi gửi lời chào thành viên mới:', err.response?.data || err.message);
  }
}

module.exports = {
  sendWelcomeGreeting,
};
