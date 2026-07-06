const express = require('express');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');

// ───── Security Middleware ─────
const { requireApiKey } = require('../middleware/auth');
const { verifyLuaSignature } = require('../middleware/luaSignature');
const { luaLimiter } = require('../middleware/rateLimiter');
const { validate, luaUpdateSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');

const router = express.Router();

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

// ══════════════════════════════════════════════════════════════
// @desc    Receive update from Lua script in Roblox
// @route   POST /api/lua/update OR /api/client/update OR /api/lua/heartbeat
// @access  Private (API Key + HMAC Signature required)
//
// Security stack applied in order:
//   1. luaLimiter       → 30 req/min per API key + IP
//   2. verifyLuaSignature → HMAC-SHA256 + timestamp + nonce
//   3. validate(luaUpdateSchema) → Zod schema validation
// ══════════════════════════════════════════════════════════════
router.post(
  ['/update', '/client/update', '/heartbeat'],
  luaLimiter,
  requireApiKey,
  validate(luaUpdateSchema),
  async (req, res) => {
    const payload = req.body;
    const user = req.apiUser;

    const robloxUsername = payload.username || payload.roblox_username;
    if (!robloxUsername) {
      return res.status(400).json({ success: false, message: 'robloxUsername is required' });
    }

    try {
      // In-memory Mock fallback
      if (!global.dbConnected) {
        let account = mockStore.findAccountByRobloxName(user.id, robloxUsername);
        let isNew = false;
        let oldLevel = 1;

        if (!account) {
          account = mockStore.createAccount(user.id, robloxUsername);
          isNew = true;
        } else {
          oldLevel = account.level;
        }

        // Update account details
        account.level = payload.level || account.level;
        account.beli = payload.beli !== undefined ? payload.beli : account.beli;
        account.fragments = payload.fragments !== undefined ? payload.fragments : account.fragments;
        account.sea = payload.sea || account.sea;
        account.race = payload.race || account.race;
        account.status = payload.status || 'grinding';
        account.location = payload.location || account.location;
        account.playtime = payload.playtime || account.playtime;
        account.lastSeen = new Date();

        account.equipped = {
          fruit: payload.fruit_equipped || payload.fruit || account.equipped.fruit,
          fruitMastery: payload.fruit_mastery || account.equipped.fruitMastery,
          sword: payload.sword || (payload.weapons && payload.weapons[0]) || account.equipped.sword,
          gun: payload.gun || (payload.guns && payload.guns[0]) || account.equipped.gun,
          fightingStyle: payload.fighting_style || (payload.styles && payload.styles[0]) || account.equipped.fightingStyle,
          accessory: payload.accessory_equipped || account.equipped.accessory || 'None',
        };

        // Handle Session In Memory
        let activeSession = mockStore.findActiveSession(account.id);
        if (activeSession) {
          activeSession.endTime = new Date();
          activeSession.duration = Math.floor((new Date().getTime() - new Date(activeSession.startTime).getTime()) / 1000);
        } else {
          activeSession = mockStore.createSession(account.id);
        }

        // Update Inventory In Memory
        let inventory = mockStore.findInventory(account.id);
        if (!inventory) {
          inventory = mockStore.createInventory(account.id);
        }

        if (payload.inventory) {
          inventory.fruits = payload.inventory.fruits || payload.inventory.stored_fruits || inventory.fruits;
          inventory.weapons = payload.inventory.swords || payload.inventory.weapons || inventory.weapons;
          inventory.guns = payload.inventory.guns || inventory.guns;
          inventory.styles = payload.inventory.styles || payload.inventory.fighting_styles || inventory.styles;
          inventory.accessories = payload.inventory.accessories || inventory.accessories;
          if (payload.inventory.materials) {
            inventory.materials = normalizeMaterials(payload.inventory.materials);
          }
        } else {
          if (payload.weapons) inventory.weapons = payload.weapons;
          if (payload.guns) inventory.guns = payload.guns;
          if (payload.styles) inventory.styles = payload.styles;
          if (payload.accessories) inventory.accessories = payload.accessories;
          if (payload.materials) inventory.materials = normalizeMaterials(payload.materials);
          if (payload.inventory_fruits || payload.fruits) inventory.fruits = payload.inventory_fruits || payload.fruits;
        }
        inventory.lastUpdated = new Date();

        // Logs
        const newLogs = [];
        if (!isNew && account.level > oldLevel) {
          const log = mockStore.addLog(account.id, 'level_up', `Leveled up from ${oldLevel} to ${account.level}`);
          newLogs.push(log);
        }

        const io = req.app.get('io');
        if (io) {
          io.to(user.id).emit('account_update', {
            account,
            inventory,
            activeSession,
            logs: newLogs.length > 0 ? newLogs : undefined,
          });
        }

        securityLogger.info('Lua update processed (mock)', { username: robloxUsername, userId: user.id });

        return res.status(200).json({
          success: true,
          message: 'Account updated successfully (Mock Mode)',
          accountId: account.id,
        });
      }

      // 1. Find or create Account
      let account = await Account.findOne({ userId: user._id, robloxUsername });
      let isNew = false;
      let oldLevel = 1;
      let oldBeli = 0;
      let oldFragments = 0;

      if (!account) {
        account = new Account({
          userId: user._id,
          robloxUsername,
        });
        isNew = true;
      } else {
        oldLevel = account.level;
        oldBeli = account.beli;
        oldFragments = account.fragments;
      }

      const oldLastSeen = account.lastSeen || new Date();

      // Update account stats
      account.level = payload.level || account.level;
      account.beli = payload.beli !== undefined ? payload.beli : account.beli;
      account.fragments = payload.fragments !== undefined ? payload.fragments : account.fragments;
      account.sea = payload.sea || account.sea;
      account.race = payload.race || account.race;
      account.status = payload.status || 'grinding';
      account.location = payload.location || account.location;
      account.playtime = payload.playtime || account.playtime;
      account.lastSeen = Date.now();

      // Normalizing equipped item fields
      account.equipped = {
        fruit: payload.fruit_equipped || payload.fruit || account.equipped.fruit,
        fruitMastery: payload.fruit_mastery || account.equipped.fruitMastery,
        sword: payload.sword || (payload.weapons && payload.weapons[0]) || account.equipped.sword,
        gun: payload.gun || (payload.guns && payload.guns[0]) || account.equipped.gun,
        fightingStyle: payload.fighting_style || (payload.styles && payload.styles[0]) || account.equipped.fightingStyle,
        accessory: payload.accessory_equipped || account.equipped.accessory || 'None',
      };

      await account.save();

      // 2. Handle Session Tracking
      let activeSession = await Session.findOne({ accountId: account._id, online: true });
      const sessionTimeoutThreshold = 5 * 60 * 1000; // 5 minutes

      if (activeSession) {
        const timeSinceLastSeen = Date.now() - new Date(oldLastSeen).getTime();
        if (timeSinceLastSeen > sessionTimeoutThreshold) {
          // Close old session
          activeSession.online = false;
          activeSession.endTime = Date.now();
          activeSession.duration = Math.floor((activeSession.endTime - activeSession.startTime) / 1000);
          await activeSession.save();

          // Open new session
          activeSession = await Session.create({
            accountId: account._id,
            startTime: Date.now(),
            online: true,
          });
        } else {
          // Update active session duration
          activeSession.endTime = Date.now();
          activeSession.duration = Math.floor((activeSession.endTime - activeSession.startTime) / 1000);
          await activeSession.save();
        }
      } else {
        // Start a new session
        activeSession = await Session.create({
          accountId: account._id,
          startTime: Date.now(),
          online: true,
        });
      }

      // 3. Update Inventory
      let inventory = await Inventory.findOne({ accountId: account._id });
      let oldInventory = null;
      if (!inventory) {
        inventory = new Inventory({ accountId: account._id });
      } else {
        oldInventory = JSON.parse(JSON.stringify(inventory));
      }

      // Inventory items mapping
      if (payload.inventory) {
        inventory.fruits = payload.inventory.fruits || payload.inventory.stored_fruits || inventory.fruits;
        inventory.weapons = payload.inventory.swords || payload.inventory.weapons || inventory.weapons;
        inventory.guns = payload.inventory.guns || inventory.guns;
        inventory.styles = payload.inventory.styles || payload.inventory.fighting_styles || inventory.styles;
        inventory.accessories = payload.inventory.accessories || inventory.accessories;
        if (payload.inventory.materials) {
          inventory.materials = normalizeMaterials(payload.inventory.materials);
        }
      } else {
        // Flat payload fallbacks
        if (payload.weapons) inventory.weapons = payload.weapons;
        if (payload.guns) inventory.guns = payload.guns;
        if (payload.styles) inventory.styles = payload.styles;
        if (payload.accessories) inventory.accessories = payload.accessories;
        if (payload.materials) {
          inventory.materials = normalizeMaterials(payload.materials);
        }
        if (payload.inventory_fruits || payload.fruits) {
          inventory.fruits = payload.inventory_fruits || payload.fruits;
        }
      }

      inventory.lastUpdated = Date.now();
      await inventory.save();

      // 4. Generate Logs for changes
      const logs = [];

      // Level up log
      if (!isNew && account.level > oldLevel) {
        logs.push({
          accountId: account._id,
          type: 'level_up',
          description: `Leveled up from ${oldLevel} to ${account.level}`,
        });
      }

      // Stored fruits log
      if (oldInventory && inventory.fruits.length > oldInventory.fruits.length) {
        const addedFruits = inventory.fruits.filter(f => !oldInventory.fruits.includes(f));
        addedFruits.forEach((fruit) => {
          logs.push({
            accountId: account._id,
            type: 'fruit_obtained',
            description: `Obtained fruit: ${fruit}`,
          });
        });
      }

      // Stored weapons log
      if (oldInventory && inventory.weapons.length > oldInventory.weapons.length) {
        const addedWeapons = inventory.weapons.filter(w => !oldInventory.weapons.includes(w));
        addedWeapons.forEach((weapon) => {
          logs.push({
            accountId: account._id,
            type: 'item_drop',
            description: `New weapon dropped: ${weapon}`,
          });
        });
      }

      // Save logs to database
      if (logs.length > 0) {
        await Log.insertMany(logs);
      }

      // 5. Realtime socket broadcast to this user's channel
      const io = req.app.get('io');
      if (io) {
        const room = user._id.toString();
        io.to(room).emit('account_update', {
          account,
          inventory,
          activeSession,
          logs: logs.length > 0 ? logs : undefined,
        });
      }

      securityLogger.info('Lua update processed', { username: robloxUsername, userId: user._id });

      res.status(200).json({
        success: true,
        message: 'Account updated successfully',
        accountId: account._id,
      });
    } catch (error) {
      console.error('Lua Ingestion Error:', error);
      securityLogger.error('Lua ingestion failed', { error: error.message, username: robloxUsername });
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
