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
      fruit_equipped,
      fruit_mastery,
      fruitMastery,
      sword = 'None',
      gun = 'None',
      fightingStyle = 'Combat',
      fighting_style,
      accessory_equipped,
      accessory = 'None',
      location,
      playtime,
      inventory,
      device = 'Windows Client',
      status = 'online'
    } = req.body;

    if (!robloxUsername) {
      return res.status(400).json({ success: false, message: 'Tên tài khoản robloxUsername không được để trống' });
    }

    const effectiveFruit = fruit_equipped || fruit || 'None';
    const effectiveFruitMastery = fruit_mastery !== undefined ? fruit_mastery : (fruitMastery !== undefined ? fruitMastery : 0);
    const effectiveFightingStyle = fighting_style || fightingStyle || 'Combat';
    const effectiveAccessory = accessory_equipped || accessory || 'None';

    const mongoose = require('mongoose');
    let targetUserId = user._id || user.id;

    if (global.dbConnected && typeof targetUserId === 'string' && !mongoose.Types.ObjectId.isValid(targetUserId)) {
      // Find real mongo user by email or username
      const dbUser = await User.findOne({ username: user.username }) || await User.findOne();
      if (dbUser) targetUserId = dbUser._id;
    }

    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Helper to normalize material inputs
    const normalizeMaterials = (materialsList) => {
      if (!materialsList || !Array.isArray(materialsList)) return [];
      const map = {};
      materialsList.forEach((m) => {
        if (typeof m === 'string') {
          map[m] = (map[m] || 0) + 1;
        } else if (m && typeof m === 'object' && m.name) {
          map[m.name] = (map[m.name] || 0) + (m.quantity || 1);
        }
      });
      return Object.keys(map).map((name) => ({ name, quantity: map[name] }));
    };

    // 3. Find or Create Roblox Account for this User
    let account = null;
    let invRecord = null;

    if (global.dbConnected) {
      account = await Account.findOne({ userId: targetUserId, robloxUsername: new RegExp(`^${escapeRegex(robloxUsername)}$`, 'i') });
      const nextEquipped = {
        fruit: effectiveFruit,
        fruitMastery: effectiveFruitMastery,
        sword,
        gun,
        fightingStyle: effectiveFightingStyle,
        accessory: effectiveAccessory
      };

      if (!account) {
        account = new Account({
          userId: targetUserId,
          robloxUsername,
          level,
          beli,
          fragments,
          sea,
          race,
          location,
          playtime,
          status,
          lastSeen: new Date(),
          equipped: nextEquipped
        });
      } else {
        account.level = Math.max(account.level || 1, level);
        account.beli = Math.max(account.beli || 0, beli);
        account.fragments = Math.max(account.fragments || 0, fragments);
        account.sea = sea || account.sea;
        account.race = race || account.race;
        if (location) account.location = location;
        if (playtime) account.playtime = playtime;
        account.status = status || account.status;
        account.lastSeen = new Date();
        account.equipped = nextEquipped;
        account.markModified('equipped');
      }
      await account.save();

      // Update Inventory collection if inventory payload is present
      if (inventory) {
        invRecord = await Inventory.findOne({ accountId: account._id });
        if (!invRecord) invRecord = new Inventory({ accountId: account._id });
        if (inventory.fruits) invRecord.fruits = inventory.fruits;
        if (inventory.swords || inventory.weapons) invRecord.weapons = inventory.swords || inventory.weapons;
        if (inventory.guns) invRecord.guns = inventory.guns;
        if (inventory.styles || inventory.fighting_styles) invRecord.styles = inventory.styles || inventory.fighting_styles;
        if (inventory.accessories) invRecord.accessories = inventory.accessories;
        if (inventory.materials) invRecord.materials = normalizeMaterials(inventory.materials);
        invRecord.lastUpdated = new Date();
        await invRecord.save();
      }

      // Log sync event
      await Log.create({
        accountId: account._id,
        type: 'ROBLOX_LUA_SYNC',
        description: `Đồng bộ dữ liệu từ Roblox Client (${device}) - Level ${level}`
      });
    } else {
      const mockUserIdStr = (targetUserId || '').toString();
      account = mockStore.store.accounts.find(a => String(a.userId) === mockUserIdStr && a.robloxUsername.toLowerCase() === robloxUsername.toLowerCase());
      const nextEquipped = {
        fruit: effectiveFruit,
        fruitMastery: effectiveFruitMastery,
        sword,
        gun,
        fightingStyle: effectiveFightingStyle,
        accessory: effectiveAccessory
      };

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
          location,
          playtime,
          status,
          lastSeen: new Date(),
          equipped: nextEquipped
        };
        mockStore.store.accounts.push(account);
      } else {
        account.level = level;
        account.beli = beli;
        account.fragments = fragments;
        account.sea = sea;
        account.race = race;
        if (location) account.location = location;
        if (playtime) account.playtime = playtime;
        account.status = status;
        account.lastSeen = new Date();
        account.equipped = nextEquipped;
      }

      if (inventory) {
        invRecord = mockStore.findInventory(account.id);
        if (!invRecord) invRecord = mockStore.createInventory(account.id);
        if (inventory.fruits) invRecord.fruits = inventory.fruits;
        if (inventory.swords || inventory.weapons) invRecord.weapons = inventory.swords || inventory.weapons;
        if (inventory.guns) invRecord.guns = inventory.guns;
        if (inventory.styles) invRecord.styles = inventory.styles;
        if (inventory.accessories) invRecord.accessories = inventory.accessories;
        if (inventory.materials) invRecord.materials = normalizeMaterials(inventory.materials);
        invRecord.lastUpdated = new Date();
      }
    }

    // 4. Emit Socket.IO Event for Realtime Web Dashboard update
    const io = req.app.get('io');
    if (io && targetUserId) {
      const room = targetUserId.toString();
      const socketPayload = {
        account,
        inventory: invRecord,
        userCode: user.userCode,
        timestamp: new Date()
      };
      // Primary event listened by Frontend
      io.to(room).emit('account_update', socketPayload);
      // Legacy event for backward compatibility
      io.to(room).emit('account_updated', socketPayload);
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

