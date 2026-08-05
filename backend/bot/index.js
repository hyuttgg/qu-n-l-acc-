/**
 * Discord Bot Service for OceanForge Account Manager
 * Bridge between Discord Slash Commands and Backend REST APIs
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const API_BASE = process.env.BACKEND_API_URL || `http://127.0.0.1:${PORT}/api/bot`;
const BOT_SECRET = process.env.DISCORD_BOT_SECRET || 'oceanforge_bot_secret_2026';

// HTTP Client configured with Bot secret header
const botApiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${BOT_SECRET}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Slash Commands Definition Table
 */
const COMMANDS = [
  { name: 'link', description: 'Tạo mã liên kết tài khoản Discord với Website Dashboard' },
  { name: 'profile', description: 'Xem thông tin User Identity, Role, và thống kê số tài khoản' },
  { name: 'accounts', description: 'Xem danh sách các tài khoản Roblox của bạn' },
  { name: 'account', description: 'Xem chi tiết thông số của 1 tài khoản Roblox (Level, Beli, Fruits, Runtime)' },
  { name: 'online', description: 'Xem tình trạng Online / Offline / Updating' },
  { name: 'runtime', description: 'Xem tổng thời gian chạy bot của từng tài khoản' },
  { name: 'stats', description: 'Xem tổng số Beli, Fragments và chỉ số chung' },
  { name: 'apikey', description: 'Kiểm tra trạng thái API Key' },
  { name: 'history', description: 'Xem lịch sử trạng thái Online của 1 tài khoản' },
  { name: 'search', description: 'Tìm kiếm tài khoản theo chỉ số / trái quỷ / sea' },
  { name: 'logs', description: 'Xem nhật ký hoạt động gần đây của tài khoản' },
  { name: 'admin', description: '(Admin) Quản lý hệ thống người dùng và tài khoản' },
  { name: 'help', description: 'Hiển thị tất cả lệnh hỗ trợ' },
];

/**
 * Handle incoming bot command requests
 * @param {string} command 
 * @param {object} options 
 * @param {string} discordId 
 */
async function handleBotCommand(command, options = {}, discordId = '') {
  try {
    const opts = typeof options === 'string' ? { query: options, username: options } : (options || {});
    switch (command.toLowerCase()) {
      case 'link': {
        const res = await botApiClient.post('/link', { discordId });
        return res.data;
      }
      case 'profile': {
        const res = await botApiClient.get('/profile', { params: { discordId } });
        return res.data;
      }
      case 'accounts': {
        const page = opts.page || 1;
        const res = await botApiClient.get('/accounts', { params: { discordId, page } });
        return res.data;
      }
      case 'account': {
        const username = opts.username;
        if (!username) return { success: false, message: 'Vui lòng nhập tên tài khoản. Ví dụ: /account Player1' };
        const res = await botApiClient.get(`/account/${encodeURIComponent(username)}`, { params: { discordId } });
        return res.data;
      }
      case 'online': {
        const res = await botApiClient.get('/online', { params: { discordId } });
        return res.data;
      }
      case 'runtime': {
        const res = await botApiClient.get('/runtime', { params: { discordId } });
        return res.data;
      }
      case 'stats': {
        const res = await botApiClient.get('/stats', { params: { discordId } });
        return res.data;
      }
      case 'apikey': {
        const res = await botApiClient.get('/apikey', { params: { discordId } });
        return res.data;
      }
      case 'createkey': {
        const res = await botApiClient.post('/key/create', { discordId });
        return res.data;
      }
      case 'deletekey': {
        const res = await botApiClient.post('/key/delete', { discordId });
        return res.data;
      }
      case 'history': {
        const username = opts.username;
        if (!username) return { success: false, message: 'Vui lòng nhập tên tài khoản. Ví dụ: /history Player1' };
        const res = await botApiClient.get(`/history/${encodeURIComponent(username)}`, { params: { discordId } });
        return res.data;
      }
      case 'search': {
        const res = await botApiClient.get('/search', { params: { discordId, ...opts } });
        return res.data;
      }
      case 'logs': {
        const username = opts.username;
        if (!username) return { success: false, message: 'Vui lòng nhập tên tài khoản. Ví dụ: /logs Player1' };
        const res = await botApiClient.get(`/logs/${encodeURIComponent(username)}`, { params: { discordId } });
        return res.data;
      }
      case 'admin':
      case 'admin_users': {
        if (opts.username) {
          const res = await botApiClient.get(`/admin/account/${encodeURIComponent(opts.username)}`);
          return res.data;
        }
        const res = await botApiClient.get('/admin/users');
        return res.data;
      }
      case 'admin_account': {
        const username = opts.username;
        const res = await botApiClient.get(`/admin/account/${encodeURIComponent(username)}`);
        return res.data;
      }
      case 'help': {
        const res = await botApiClient.get('/help');
        return res.data;
      }
      default:
        return { success: false, message: `Lệnh /${command} không hợp lệ` };
    }
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || err.message || 'Lỗi kết nối tới Backend Web'
    };
  }
}

/**
 * Background Monitoring Service for Discord Alerts
 * Alerts on:
 * 1. Account no data for 15 minutes
 * 2. Connection lost (Lua Sender disconnect)
 * 3. API Key expired
 */
function startDiscordAlertMonitor(alertCallback) {
  setInterval(async () => {
    try {
      // Check online status for inactivity warning
      const res = await botApiClient.get('/online');
      if (res.data && res.data.summary) {
        // If there are accounts in warning state, trigger alert
        if (res.data.summary.updating > 0 && alertCallback) {
          alertCallback({
            type: 'WARNING',
            title: '⚠️ Warning',
            message: `Có ${res.data.summary.updating} tài khoản không gửi dữ liệu trong hơn 15 phút hoặc mất kết nối!`
          });
        }
      }
    } catch (err) {
      console.error('[DiscordBot Monitor Error]:', err.message);
    }
  }, 60000); // Check every 1 minute
}

const { auditDiscordMessage, executeDiscordAutoBan } = require('./discordAntiAbuseGuard');

/**
 * Audit any raw Discord message for spam/phishing and auto-ban if violation occurs
 */
async function processDiscordIncomingMessage(message) {
  const violation = auditDiscordMessage(message);
  if (violation) {
    await executeDiscordAutoBan(
      message.channel_id,
      message.id,
      message.author?.id,
      message.author?.username || 'UnknownUser',
      violation
    );
    return { banned: true, violation };
  }
  return { banned: false };
}

const { sendWelcomeGreeting } = require('./welcomeMemberBot');
const { publishVerificationEmbed, ensureVerifiedRole, lockChannelsForUnverified, handleVerifyInteraction } = require('./discordVerificationBot');

module.exports = {
  COMMANDS,
  handleBotCommand,
  startDiscordAlertMonitor,
  processDiscordIncomingMessage,
  auditDiscordMessage,
  executeDiscordAutoBan,
  sendWelcomeGreeting,
  publishVerificationEmbed,
  ensureVerifiedRole,
  lockChannelsForUnverified,
  handleVerifyInteraction,
};
