/**
 * Roblox Lua Client Webhook Endpoint
 * Multi-User SaaS API Key Telemetry Ingestion Service
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');

router.post('/roblox', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace(/^Bearer\s+/i, '').trim() || 
                   req.body.apiKey;

    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Thiếu x-api-key header' });
    }

    // 1. Authenticate user by API Key
    let user = null;
    if (global.dbConnected) {
      user = await User.findOne({ apiKey });
    }
    if (!user) {
      user = mockStore.findUserByApiKey(apiKey);
    }
    // Fallback for development mock mode only when DB is not connected
    if (!user && !global.dbConnected && apiKey.startsWith('forge_')) {
      user = mockStore.store.users[0] || mockStore.createUser('OceanForgeUser', 'demo@oceanforge.io', 'pass123');
      user.apiKey = apiKey;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'API Key không hợp lệ hoặc đã bị huỷ' });
    }

    // 2. Extract Roblox account telemetry payload from Lua script
    const {
      robloxUsername,
      level = 1,
      beli = 0,
      fragments = 0,
      sea = 1,
      race = 'Human',
      fruit = 'None',
      sword = 'None',
      gun = 'None',
      fightingStyle = 'Combat',
      device = 'Windows Client',
      status = 'online'
    } = req.body;

    if (!robloxUsername) {
      return res.status(400).json({ success: false, message: 'Tên tài khoản robloxUsername không được để trống' });
    }

    const mongoose = require('mongoose');
    let targetUserId = user._id || user.id;

    if (global.dbConnected && typeof targetUserId === 'string' && !mongoose.Types.ObjectId.isValid(targetUserId)) {
      // Find real mongo user by email or username
      const dbUser = await User.findOne({ username: user.username }) || await User.findOne();
      if (dbUser) targetUserId = dbUser._id;
    }

    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 3. Find or Create Roblox Account for this User
    let account = null;
    if (global.dbConnected) {
      account = await Account.findOne({ userId: targetUserId, robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
      if (!account) {
        account = new Account({
          userId: targetUserId,
          robloxUsername,
          level,
          beli,
          fragments,
          sea,
          race,
          status: 'online',
          lastSeen: new Date(),
          equipped: { fruit, sword, gun, fightingStyle }
        });
      } else {
        account.level = Math.max(account.level || 1, level);
        account.beli = Math.max(account.beli || 0, beli);
        account.fragments = Math.max(account.fragments || 0, fragments);
        account.sea = sea || account.sea;
        account.race = race || account.race;
        account.status = status;
        account.lastSeen = new Date();
        account.equipped = { fruit, sword, gun, fightingStyle };
      }
      await account.save();

      // Log sync event
      await Log.create({
        accountId: account._id,
        type: 'ROBLOX_LUA_SYNC',
        description: `Đồng bộ dữ liệu từ Roblox Client (${device}) - Level ${level}`
      });
    } else {
      const mockUserIdStr = (targetUserId || '').toString();
      account = mockStore.store.accounts.find(a => String(a.userId) === mockUserIdStr && a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
      if (!account) {
        account = {
          id: 'acc_' + Date.now(),
          userId: targetUserId,
          robloxUsername,
          level,
          beli,
          fragments,
          sea,
          race,
          status: 'online',
          lastSeen: new Date(),
          equipped: { fruit, sword, gun, fightingStyle }
        };
        mockStore.store.accounts.push(account);
      } else {
        account.level = level;
        account.beli = beli;
        account.fragments = fragments;
        account.sea = sea;
        account.status = 'online';
        account.lastSeen = new Date();
        account.equipped = { fruit, sword, gun, fightingStyle };
      }
    }

    // 4. Emit Socket.IO Event for Realtime Web Dashboard update if available
    const io = req.app.get('io');
    if (io && targetUserId) {
      io.to(targetUserId.toString()).emit('account_updated', {
        account,
        userCode: user.userCode,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: `✓ Đã đồng bộ dữ liệu cho tài khoản ${robloxUsername} thành công!`,
      owner: user.username,
      userCode: user.userCode,
      updatedAccount: robloxUsername
    });

  } catch (err) {
    console.error('[Lua Webhook Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

// ──────────────────────────────────────────────────────────────────────────────
// Discord Interactions Endpoint — handles "✅ Verify" button clicks
// Mount this in your main server.js as:
//   app.post('/api/discord/interactions', require('./routes/webhook').discordInteractions);
// ──────────────────────────────────────────────────────────────────────────────
const { handleVerifyInteraction } = require('../bot/discordVerificationBot');

const discordInteractions = async (req, res) => {
  const body = req.body;

  // Discord sends a PING (type 1) to validate the endpoint
  if (body.type === 1) {
    return res.json({ type: 1 }); // PONG
  }

  // MESSAGE_COMPONENT interaction (type 3) — button clicks
  if (body.type === 3) {
    const customId = body.data?.custom_id;

    if (customId === 'oceanforge_verify_btn') {
      const userId = body.member?.user?.id || body.user?.id;
      const username = body.member?.user?.username || body.user?.username || 'UnknownUser';

      const result = await handleVerifyInteraction(userId, username);

      // Respond with ephemeral message (only the clicker can see)
      return res.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: result.message,
          flags: 64, // EPHEMERAL — only visible to the user who clicked
        },
      });
    }
  }

  // Unknown interaction
  return res.json({ type: 1 });
};

module.exports.discordInteractions = discordInteractions;

