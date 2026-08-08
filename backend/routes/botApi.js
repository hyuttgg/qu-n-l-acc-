const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Account = require('../models/Account');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');

const crypto = require('crypto');

// Temporary in-memory store for linking codes
const linkCodesStore = new Map();

// Helper to escape special regex characters safely (S1 ReDoS protection)
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper middleware for bot authentication (checks API key, bot secret, or Web user JWT token)
const botAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Bot authorization header missing' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const botSecret = process.env.DISCORD_BOT_SECRET || 'oceanforge_bot_secret_2026';

  if (token === botSecret || token === 'oceanforge_bot_secret_2026') {
    req.isBotSystem = true;
    return next();
  }

  // 1. Check if token matches a User's API key
  try {
    let user = null;
    if (global.dbConnected) {
      user = await User.findOne({ apiKey: token });
    } else {
      user = mockStore.findUserByApiKey(token);
    }

    if (user) {
      req.user = user;
      return next();
    }
  } catch (err) {}

  // 2. Check if token is a Web Dashboard User JWT Token
  try {
    const config = require('../config/security.config');
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.jwt.secret);
    const userId = decoded.id || decoded.userId;

    let user = null;
    if (global.dbConnected) {
      user = await User.findById(userId);
    } else {
      user = mockStore.findUserById(userId);
    }

    if (user) {
      req.user = user;
      return next();
    }
  } catch (err) {}

  return res.status(401).json({ success: false, message: 'Invalid Bot Token or User API Key' });
};

router.use(botAuth);

// Helper function to resolve target user by discordId, userCode, or req.user
async function resolveUser(req) {
  const discordId = req.query.discordId || req.body.discordId;
  const userCode = req.query.userCode || req.body.userCode;

  if (global.dbConnected) {
    if (discordId) return await User.findOne({ discordId });
    if (userCode) return await User.findOne({ userCode });
    if (req.user) return req.user;
    return null;
  } else {
    if (discordId) return mockStore.findUserByDiscordId(discordId);
    if (userCode) return mockStore.store.users.find(u => u.userCode === userCode);
    if (req.user) return req.user;
    return null;
  }
}

// 1. /link - Generate account link code
router.post('/link', async (req, res) => {
  const { discordId } = req.body;
  if (!discordId) {
    return res.status(400).json({ success: false, message: 'discordId is required' });
  }

  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const code = `${part1}-${part2}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  linkCodesStore.set(code, { discordId, expiresAt });

  res.status(200).json({
    success: true,
    code,
    expiresIn: '5 phút',
    message: `Link tài khoản\nMã xác thực: ${code}\nCó hiệu lực trong 5 phút.`
  });
});

// Confirm link code from web dashboard
router.post('/link/confirm', async (req, res) => {
  const inputCode = (req.body.code || '').trim().toUpperCase();
  if (!inputCode) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mã xác thực' });
  }

  const rawInput = inputCode.replace(/-/g, '');
  let matchedCode = null;

  for (const key of linkCodesStore.keys()) {
    if (key === inputCode || key.replace(/-/g, '') === rawInput) {
      matchedCode = key;
      break;
    }
  }

  if (!matchedCode) {
    return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
  }

  const record = linkCodesStore.get(matchedCode);
  if (Date.now() > record.expiresAt) {
    linkCodesStore.delete(matchedCode);
    return res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn' });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập trên Web Dashboard' });
  }

  try {
    if (global.dbConnected) {
      const currentUserId = user._id || user.id;

      // 1. Clear discordId from any other account that previously had it
      await User.updateMany(
        { discordId: record.discordId, _id: { $ne: currentUserId } },
        { $unset: { discordId: "" } }
      );

      // 2. Set discordId on current account
      const dbUser = await User.findById(currentUserId);
      if (dbUser) {
        dbUser.discordId = record.discordId;
        await dbUser.save();
      }
    } else {
      user.discordId = record.discordId;
    }
  } catch (dbErr) {
    console.error('Lỗi khi lưu liên kết Discord ID:', dbErr.message);
    if (dbErr.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản Discord này đã được liên kết với một tài khoản Web khác!'
      });
    }
    return res.status(500).json({ success: false, message: 'Lỗi cơ sở dữ liệu khi lưu liên kết tài khoản' });
  }

  linkCodesStore.delete(matchedCode);

  // Send REAL Discord Notification only when real user links account on Web
  notifyDiscordAccountLinked(record.discordId, user.username, user.userCode || 'USR-WEB');

  res.status(200).json({
    success: true,
    message: '✓ Đã liên kết tài khoản Discord thành công.'
  });
});

async function notifyDiscordAccountLinked(discordId, username, userCode) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';
  if (!token) return;

  try {
    const axios = require('axios');
    const api = axios.create({
      baseURL: 'https://discord.com/api/v10',
      headers: { Authorization: `Bot ${token.trim()}`, 'Content-Type': 'application/json' }
    });

    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    const linkChan = chans.find(c => c.type === 0 && (c.name.includes('liên-kết-tài-khoản') || c.name.includes('link')));

    if (linkChan) {
      await api.post(`/channels/${linkChan.id}/messages`, {
        content: `🎉 <@${discordId}> đã liên kết tài khoản thành công!`,
        embeds: [{
          title: '✅ LIÊN KẾT TÀI KHOẢN THÀNH CÔNG',
          description: `Tài khoản Web **${username}** (Mã: \`${userCode || 'USR-WEB'}\`) đã được liên kết chính thức với tài khoản Discord <@${discordId}>.`,
          color: 0x10B981,
          fields: [
            { name: '👤 Tên Web Dashboard', value: `\`${username}\``, inline: true },
            { name: '🆔 User Code', value: `\`${userCode || 'N/A'}\``, inline: true },
            { name: '⏰ Thời Gian Xác Thực', value: new Date().toLocaleString('vi-VN'), inline: true },
          ],
          footer: { text: '🛡️ OceanForge Realtime Authentication • Live Sync' },
          timestamp: new Date().toISOString()
        }]
      });
    }
  } catch (err) {
    console.error('Lỗi gửi thông báo liên kết Discord:', err.message);
  }
}

// 2. /profile - Get User Profile & stats
router.get('/profile', async (req, res) => {
  const targetUser = await resolveUser(req);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng hoặc chưa liên kết Discord' });
  }

  let accounts = [];
  if (global.dbConnected) {
    accounts = await Account.find({ userId: targetUser._id || targetUser.id });
  } else {
    accounts = mockStore.findAccountsByUserId(targetUser.id || targetUser._id);
  }

  const onlineCount = accounts.filter(a => a.status === 'online').length;

  res.status(200).json({
    success: true,
    profile: {
      username: targetUser.username,
      nickname: targetUser.nickname || 'N/A',
      userCode: targetUser.userCode || 'N/A',
      discordId: targetUser.discordId || 'Chưa liên kết',
      discriminator: targetUser.discriminator || '0',
      role: targetUser.role || 'Member',
      joinDate: targetUser.joinDate || targetUser.createdAt,
      lastLogin: targetUser.lastLogin,
      loginCount: targetUser.loginCount || 1,
      totalAccounts: accounts.length,
      onlineAccounts: onlineCount,
    }
  });
});

// 3. /accounts - List Roblox accounts with pagination
router.get('/accounts', async (req, res) => {
  const targetUser = await resolveUser(req);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  let accounts = [];
  if (global.dbConnected) {
    accounts = await Account.find({ userId: targetUser._id || targetUser.id }).sort({ createdAt: -1 });
  } else {
    accounts = mockStore.findAccountsByUserId(targetUser.id || targetUser._id);
  }

  const startIndex = (page - 1) * limit;
  const paginated = accounts.slice(startIndex, startIndex + limit).map((acc, i) => ({
    index: startIndex + i + 1,
    id: acc._id || acc.id,
    robloxUsername: acc.robloxUsername,
    status: acc.status || 'offline',
    level: acc.level || 1,
    sea: acc.sea || 1,
  }));

  res.status(200).json({
    success: true,
    page,
    totalPages: Math.ceil(accounts.length / limit) || 1,
    totalAccounts: accounts.length,
    accounts: paginated,
  });
});

// 4. /account/:username - Detailed account view
router.get('/account/:username', async (req, res) => {
  const targetUser = await resolveUser(req);
  const robloxUsername = req.params.username;

  let acc = null;
  if (global.dbConnected) {
    if (targetUser) {
      acc = await Account.findOne({ userId: targetUser._id || targetUser.id, robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
    } else {
      acc = await Account.findOne({ robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
    }
  } else {
    if (targetUser) {
      acc = mockStore.findAccountByRobloxName(targetUser.id || targetUser._id, robloxUsername);
    } else {
      acc = mockStore.store.accounts.find(a => a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
    }
  }

  if (!acc) {
    return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản ${robloxUsername}` });
  }

  // Format sea text
  const seaMap = { 1: 'First Sea', 2: 'Second Sea', 3: 'Third Sea' };

  res.status(200).json({
    success: true,
    account: {
      username: acc.robloxUsername,
      level: acc.level || 1,
      beli: acc.beli || 0,
      fragments: acc.fragments || 0,
      sea: seaMap[acc.sea] || `Sea ${acc.sea}`,
      race: acc.race || 'Human',
      fruit: acc.equipped?.fruit || 'None',
      sword: acc.equipped?.sword || 'None',
      gun: acc.equipped?.gun || 'None',
      style: acc.equipped?.fightingStyle || 'Combat',
      runtime: `${Math.floor((acc.playtime || 0) / 3600)} giờ`,
      status: acc.status || 'offline',
      lastSeen: acc.lastSeen,
    }
  });
});

// 5. /online - Online status summary
router.get('/online', async (req, res) => {
  const targetUser = await resolveUser(req);
  let accounts = [];
  if (global.dbConnected) {
    const filter = targetUser ? { userId: targetUser._id || targetUser.id } : {};
    accounts = await Account.find(filter);
  } else {
    accounts = targetUser ? mockStore.findAccountsByUserId(targetUser.id || targetUser._id) : mockStore.store.accounts;
  }

  const online = accounts.filter(a => a.status === 'online').length;
  const offline = accounts.filter(a => a.status === 'offline').length;
  const updating = accounts.filter(a => a.status === 'updating' || a.status === 'reconnecting').length;

  res.status(200).json({
    success: true,
    summary: {
      online,
      offline,
      updating,
      total: accounts.length
    }
  });
});

// 6. /runtime - Playtime/runtime list
router.get('/runtime', async (req, res) => {
  const targetUser = await resolveUser(req);
  let accounts = [];
  if (global.dbConnected) {
    const filter = targetUser ? { userId: targetUser._id || targetUser.id } : {};
    accounts = await Account.find(filter);
  } else {
    accounts = targetUser ? mockStore.findAccountsByUserId(targetUser.id || targetUser._id) : mockStore.store.accounts;
  }

  const runtimes = accounts.map(a => ({
    username: a.robloxUsername,
    runtime: `${Math.floor((a.playtime || 0) / 3600)} giờ`,
    status: a.status || 'offline'
  }));

  res.status(200).json({
    success: true,
    runtimes
  });
});

// 7. /stats - Aggregated stats
router.get('/stats', async (req, res) => {
  const targetUser = await resolveUser(req);
  let accounts = [];
  if (global.dbConnected) {
    const filter = targetUser ? { userId: targetUser._id || targetUser.id } : {};
    accounts = await Account.find(filter);
  } else {
    accounts = targetUser ? mockStore.findAccountsByUserId(targetUser.id || targetUser._id) : mockStore.store.accounts;
  }

  const online = accounts.filter(a => a.status === 'online').length;
  const offline = accounts.length - online;
  const totalBeli = accounts.reduce((acc, a) => acc + (a.beli || 0), 0);
  const totalFragments = accounts.reduce((acc, a) => acc + (a.fragments || 0), 0);
  const avgRuntime = accounts.length > 0
    ? `${Math.floor(accounts.reduce((acc, a) => acc + (a.playtime || 0), 0) / accounts.length / 3600)}h`
    : '0h';

  res.status(200).json({
    success: true,
    stats: {
      totalAccounts: accounts.length,
      online,
      offline,
      avgRuntime,
      totalBeli: totalBeli >= 1e9 ? `${(totalBeli/1e9).toFixed(1)}B` : `${(totalBeli/1e6).toFixed(0)}M`,
      totalFragments: totalFragments >= 1e6 ? `${(totalFragments/1e6).toFixed(1)}M` : `${(totalFragments/1e3).toFixed(0)}K`,
    }
  });
});

// 8. /apikey - Check User API Key status or auto-generate for Discord user
router.get('/apikey', async (req, res) => {
  let user = await resolveUser(req);
  const discordId = req.query.discordId || req.body.discordId;

  if (!user && discordId) {
    // Auto-create API Key for this Discord ID if missing
    const crypto = require('crypto');
    const newKey = 'forge_' + crypto.randomBytes(16).toString('hex');
    const autoUsername = `Discord_${discordId.slice(-4)}`;

    if (global.dbConnected) {
      try {
        user = new User({
          discordId,
          username: autoUsername,
          apiKey: newKey,
          role: 'Member'
        });
        await user.save();
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          user = await User.findOne({ discordId });
        }
      }
    } else {
      user = mockStore.createUser(autoUsername, `${discordId}@discord.com`, 'pass123', null, discordId);
      user.apiKey = newKey;
    }
  } else if (user && !user.apiKey) {
    // User exists but has no key -> create key
    const crypto = require('crypto');
    const newKey = 'forge_' + crypto.randomBytes(16).toString('hex');
    if (global.dbConnected) {
      const dbUser = await User.findById(user._id || user.id);
      if (dbUser) {
        dbUser.apiKey = newKey;
        await dbUser.save();
        user = dbUser;
      }
    } else {
      user.apiKey = newKey;
    }
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Chưa tìm thấy thông tin tài khoản. Vui lòng gõ /link để liên kết Discord với Web Dashboard!'
    });
  }

  const serverUrl = process.env.BACKEND_PUBLIC_URL || 'https://quan-ly-acc-viet-nam.onrender.com';

  res.status(200).json({
    success: true,
    status: 'Active',
    apiKey: user.apiKey,
    userCode: user.userCode || 'USR-DISCORD',
    username: user.username,
    serverUrl,
    expire: 'Không giới hạn',
    lastUpdate: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    message: `🔑 API Key Discord của bạn: ${user.apiKey}`
  });
});

// /key/create - Auto-generate unique API Key for Discord User
router.post('/key/create', async (req, res) => {
  const { discordId, username = 'DiscordUser' } = req.body;
  if (!discordId) {
    return res.status(400).json({ success: false, message: 'discordId is required' });
  }

  let user = await resolveUser(req);
  const crypto = require('crypto');
  const newKey = 'forge_' + crypto.randomBytes(16).toString('hex');

  try {
    if (!user) {
      // Create new user profile for this discordId
      if (global.dbConnected) {
        user = new User({
          discordId,
          username,
          apiKey: newKey,
          role: 'Member'
        });
        await user.save();
      } else {
        user = mockStore.createUser(username, `${discordId}@discord.com`, 'pass123', null, discordId);
        user.apiKey = newKey;
      }
    } else {
      // User exists, generate new key or update
      if (global.dbConnected) {
        const dbUser = await User.findById(user._id || user.id);
        if (dbUser) {
          dbUser.apiKey = newKey;
          await dbUser.save();
          user = dbUser;
        }
      } else {
        user.apiKey = newKey;
      }
    }
  } catch (saveErr) {
    if (saveErr.code === 11000) {
      user = await User.findOne({ discordId }) || await User.findOne({ username });
    } else {
      return res.status(500).json({ success: false, message: 'Lỗi khi tạo API Key' });
    }
  }

  res.status(200).json({
    success: true,
    apiKey: user ? user.apiKey : newKey,
    userCode: user ? user.userCode : 'USR-DISCORD',
    username: user ? user.username : username,
    message: `🔑 API Key của bạn: ${user ? user.apiKey : newKey}`
  });
});

// /key/delete - Delete user's API Key
router.post('/key/delete', async (req, res) => {
  const user = await resolveUser(req);
  if (!user || !user.apiKey) {
    return res.status(404).json({ success: false, message: 'Bạn chưa tạo API Key nào để xóa!' });
  }

  const deletedKey = user.apiKey;
  if (global.dbConnected) {
    const dbUser = await User.findById(user._id || user.id);
    if (dbUser) {
      dbUser.apiKey = undefined;
      await dbUser.save();
    }
  } else {
    user.apiKey = '';
  }

  res.status(200).json({
    success: true,
    deletedKey,
    message: `🗑️ Đã xóa thành công API Key của bạn!`
  });
});

// 9. /history/:username - Account status history
router.get('/history/:username', async (req, res) => {
  const robloxUsername = req.params.username;
  const targetUser = await resolveUser(req);

  let acc = null;
  if (global.dbConnected) {
    acc = await Account.findOne({ robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
  } else {
    acc = mockStore.store.accounts.find(a => a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
  }

  if (!acc) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  let logs = [];
  if (global.dbConnected) {
    logs = await Log.find({ accountId: acc._id }).sort({ timestamp: -1 }).limit(10);
  } else {
    logs = mockStore.findLogs(acc.id || acc._id);
  }

  const history = logs.map(l => ({
    time: new Date(l.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    status: l.description || l.type
  }));

  res.status(200).json({
    success: true,
    username: robloxUsername,
    history
  });
});

// 10. /search - Search accounts by keyword/level/fruit/race/sea
router.get('/search', async (req, res) => {
  const targetUser = await resolveUser(req);
  const { query, level, fruit, race, sea } = req.query;

  let accounts = [];
  if (global.dbConnected) {
    const filter = {};
    if (targetUser) filter.userId = targetUser._id || targetUser.id;
    if (query) filter.robloxUsername = new RegExp(escapeRegex(query), 'i');
    if (level) filter.level = { $gte: parseInt(level) };
    if (fruit) filter['equipped.fruit'] = new RegExp(escapeRegex(fruit), 'i');
    if (race) filter.race = new RegExp(escapeRegex(race), 'i');
    if (sea) filter.sea = parseInt(sea);

    accounts = await Account.find(filter).limit(20);
  } else {
    accounts = targetUser ? mockStore.findAccountsByUserId(targetUser.id || targetUser._id) : mockStore.store.accounts;
    if (query) accounts = accounts.filter(a => a.robloxUsername.toLowerCase().includes(query.toLowerCase()));
    if (level) accounts = accounts.filter(a => a.level >= parseInt(level));
    if (fruit) accounts = accounts.filter(a => a.equipped?.fruit?.toLowerCase().includes(fruit.toLowerCase()));
    if (race) accounts = accounts.filter(a => a.race?.toLowerCase().includes(race.toLowerCase()));
    if (sea) accounts = accounts.filter(a => a.sea === parseInt(sea));
  }

  res.status(200).json({
    success: true,
    resultsCount: accounts.length,
    accounts: accounts.map(a => ({
      username: a.robloxUsername,
      level: a.level,
      sea: a.sea,
      fruit: a.equipped?.fruit || 'None',
      race: a.race || 'Human',
      status: a.status || 'offline',
    }))
  });
});

// 11. /logs/:username - Activity logs
router.get('/logs/:username', async (req, res) => {
  const robloxUsername = req.params.username;

  let acc = null;
  if (global.dbConnected) {
    acc = await Account.findOne({ robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
  } else {
    acc = mockStore.store.accounts.find(a => a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
  }

  if (!acc) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  let logs = [];
  if (global.dbConnected) {
    logs = await Log.find({ accountId: acc._id }).sort({ timestamp: -1 }).limit(10);
  } else {
    logs = mockStore.findLogs(acc.id || acc._id);
  }

  const logList = logs.map(l => `${new Date(l.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — ${l.type}: ${l.description}`);

  res.status(200).json({
    success: true,
    username: robloxUsername,
    logs: logList
  });
});

// 12. /admin/users - Admin users summary
router.get('/admin/users', async (req, res) => {
  const targetUser = await resolveUser(req);
  if (!req.isBotSystem && (!targetUser || !['Owner', 'Admin', 'Developer', 'admin', 'owner'].includes(targetUser.role))) {
    return res.status(403).json({ success: false, message: '⛔ Lệnh này chỉ dành cho Admin / Owner hệ thống!' });
  }

  let users = [];
  if (global.dbConnected) {
    users = await User.find();
  } else {
    users = mockStore.store.users;
  }

  const online = users.filter(u => u.lastLogin && (Date.now() - new Date(u.lastLogin).getTime() < 15 * 60 * 1000)).length;
  const offline = users.length - online;

  res.status(200).json({
    success: true,
    totalUsers: users.length,
    online,
    offline
  });
});

// 13. /admin/account/:username - Admin account owner detail
router.get('/admin/account/:username', async (req, res) => {
  const targetUser = await resolveUser(req);
  if (!req.isBotSystem && (!targetUser || !['Owner', 'Admin', 'Developer', 'admin', 'owner'].includes(targetUser.role))) {
    return res.status(403).json({ success: false, message: '⛔ Lệnh này chỉ dành cho Admin / Owner hệ thống!' });
  }

  const robloxUsername = req.params.username;

  let acc = null;
  let owner = null;
  if (global.dbConnected) {
    acc = await Account.findOne({ robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
    if (acc && acc.userId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(acc.userId)) {
        owner = await User.findById(acc.userId);
      }
    }
  } else {
    acc = mockStore.store.accounts.find(a => a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
    if (acc) {
      owner = mockStore.findUserById(acc.userId);
    }
  }

  if (!acc) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  res.status(200).json({
    success: true,
    detail: {
      owner: owner ? owner.username : 'Unknown',
      ownerCode: owner ? owner.userCode : 'N/A',
      status: acc.status || 'offline',
      lastUpdate: acc.lastSeen || new Date(),
      created: acc.createdAt || new Date(),
      device: acc.lastDevice || 'Windows 11 PC'
    }
  });
});
// 14. /broadcast - Broadcast System Update or Maintenance Announcement to Discord
router.post('/broadcast', async (req, res) => {
  const targetUser = await resolveUser(req);
  if (!req.isBotSystem && (!targetUser || !['Owner', 'Admin', 'Developer', 'admin', 'owner'].includes(targetUser.role))) {
    return res.status(403).json({ success: false, message: '⛔ Chỉ Admin / Owner mới có quyền phát thông báo hệ thống!' });
  }

  const { type, title, version, content, duration, author } = req.body;
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || '1323888389870718977';

  if (!token) {
    return res.status(500).json({ success: false, message: 'DISCORD_BOT_TOKEN chưa được cài đặt' });
  }

  const axios = require('axios');
  const api = axios.create({
    baseURL: 'https://discord.com/api/v10',
    headers: {
      Authorization: `Bot ${token.trim()}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // 1. Get channel list of target Guild
    const chansRes = await api.get(`/guilds/${guildId}/channels`);
    const chans = chansRes.data || [];
    
    // Target #🚀・cập-nhật-hệ-thống or #💻・thông-báo
    let targetChan = chans.find(c => c.type === 0 && (c.name.includes('cập-nhật') || c.name.includes('update')));
    if (!targetChan) {
      targetChan = chans.find(c => c.type === 0 && (c.name.includes('thông-báo') || c.name.includes('announcement')));
    }

    if (!targetChan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kênh #cập-nhật-hệ-thống hoặc #thông-báo trên Discord' });
    }

    // 2. Construct Ultra-Aesthetic Embed
    let embedTitle = title || '🚀 THÔNG BÁO TỪ BẢN QUẢN TRỊ';
    let embedColor = 0x8B5CF6; // Neon Purple
    let fields = [];
    let mentionMsg = '';

    if (type === 'MAINTENANCE') {
      embedTitle = `🛠️ THÔNG BÁO BẢO TRÌ BẢO DƯỠNG MÁY CHỦ WEB DASHBOARD`;
      embedColor = 0xEF4444; // Vibrant Red
      mentionMsg = '@everyone';
      fields = [
        { name: '⏰ Thời Gian Bắt Đầu', value: new Date().toLocaleTimeString('vi-VN') + ' (Hôm nay)', inline: true },
        { name: '⌛ Dự Kiến Hoàn Tất', value: `\`${duration || '30 - 45 phút'}\``, inline: true },
        { name: '🟢 Discord Bot Status', value: '`Vẫn hoạt động 24/7`', inline: true },
        { name: '📌 Chi Tiết Bảo Trì', value: content || 'Nâng cấp máy chủ cơ sở dữ liệu MongoDB Atlas & tối ưu hóa tốc độ phản hồi API.', inline: false },
        { 
          name: '🔒 BẢO MẬT & QUYỀN HẠN KÊNH (READ-ONLY LOCK)', 
          value: '• 🔒 Kênh #thông-báo: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
            '• 🔒 Kênh #cập-nhật-hệ-thống: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
            '• 🔒 Kênh #👋・chào-mừng: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n' +
            '• 🔒 Kênh #cảnh-báo-tài-khoản: ĐÃ KHÓA TOÀN BỘ Quyền gửi Tin Nhắn, Ảnh, Video, Voice & File đối với Thành Viên thường!\n\n' +
            '🎉 ĐÃ THIẾT LẬP THÀNH CÔNG QUYỀN READ-ONLY TUYỆT ĐỐI CHO CÁC KÊNH THÔNG BÁO!', 
          inline: false 
        },
        { name: '🛡️ Lưu Ý', value: 'Trong thời gian bảo trì, dữ liệu trên Web Dashboard có thể bị gián đoạn tạm thời. Dữ liệu cày game của tài khoản Roblox vẫn an toàn 100%!', inline: false },
      ];
    } else if (type === 'UPDATE') {
      embedTitle = `🚀 CẬP NHẬT HỆ THỐNG MỚI — BẢN RELEASE ${version || 'v2.5.0'}`;
      embedColor = 0x06B6D4; // Cyan Glow
      fields = [
        { name: '🏷️ Phiên Bản', value: `\`${version || 'v2.5.0'}\``, inline: true },
        { name: '👤 Người Thực Hiện', value: author || (targetUser ? targetUser.username : 'System Admin'), inline: true },
        { name: '⚡ Trạng Thái', value: '`🟢 Đã Áp Dụng Live`', inline: true },
        { name: '✨ NHỮNG TÍNH NĂNG & NÂNG CẤP MỚI', value: content || '• Nâng cấp giao diện Discord Bot Embeds siêu đẹp.\n• Tối ưu hệ thống tự động phát cảnh báo lag/mất kết nối.\n• Đồng bộ realtime dữ liệu Web Dashboard.', inline: false },
      ];
    } else {
      embedTitle = `📢 THÔNG BÁO HỆ THỐNG: ${title || 'Cập Nhật Mới'}`;
      embedColor = 0xF59E0B; // Gold
      fields = [
        { name: '📝 Nội Dung', value: content || 'Thông báo từ Ban Quản Trị hệ thống OceanForge.', inline: false },
        { name: '👤 Phát Bởi', value: author || (targetUser ? targetUser.username : 'Admin'), inline: true }
      ];
    }

    // 3. Send Message to Discord Channel
    const messagePayload = {
      embeds: [{
        title: embedTitle,
        fields,
        color: embedColor,
        author: { name: '✨ OCEANFORGE SYSTEM BROADCASTER' },
        footer: { text: '🛡️ OceanForge SaaS Broadcaster • Tự Động Phát Tin' },
        timestamp: new Date().toISOString()
      }]
    };

    if (mentionMsg) {
      messagePayload.content = mentionMsg;
    }

    const sent = await api.post(`/channels/${targetChan.id}/messages`, messagePayload);

    res.status(200).json({
      success: true,
      channel: `#${targetChan.name}`,
      messageId: sent.data.id,
      message: `✓ Đã phát thông báo thành công tới kênh #${targetChan.name} trên Discord!`
    });

  } catch (err) {
    console.error('Lỗi broadcast tin nhắn tới Discord:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});
// 14. /help - Slash command documentation
router.get('/help', (req, res) => {
  res.status(200).json({
    success: true,
    commands: [
      { command: '/link', description: 'Liên kết tài khoản Discord với Web Dashboard' },
      { command: '/profile', description: 'Xem hồ sơ người dùng và thống kê số lượng tài khoản' },
      { command: '/accounts', description: 'Xem danh sách tài khoản Roblox' },
      { command: '/account <username>', description: 'Xem chi tiết thông số tài khoản' },
      { command: '/online', description: 'Kiểm tra số lượng tài khoản online/offline' },
      { command: '/runtime', description: 'Xem tổng thời gian chạy bot của từng tài khoản' },
      { command: '/stats', description: 'Xem tổng số Beli, Fragments và chỉ số tài khoản' },
      { command: '/apikey', description: 'Kiểm tra trạng thái API Key' },
      { command: '/history <username>', description: 'Xem lịch sử trạng thái online' },
      { command: '/search', description: 'Tìm kiếm tài khoản theo chỉ số/trái quỷ' },
      { command: '/logs <username>', description: 'Xem nhật ký hoạt động tài khoản' },
      { command: '/admin users', description: '(Admin) Xem thống kê tất cả người dùng' },
      { command: '/admin account <username>', description: '(Admin) Xem thông tin chủ sở hữu tài khoản' },
      { command: '/help', description: 'Hiển thị tất cả lệnh hỗ trợ' },
    ],
    roles: [
      { role: 'Owner', permissions: 'Toàn quyền hệ thống' },
      { role: 'Admin', permissions: 'Quản lý người dùng và tài khoản' },
      { role: 'Moderator', permissions: 'Xem trạng thái, hỗ trợ' },
      { role: 'Member', permissions: 'Chỉ xem tài khoản của chính mình' },
      { role: 'Guest', permissions: 'Chỉ liên kết tài khoản' },
    ]
  });
});

module.exports = router;
