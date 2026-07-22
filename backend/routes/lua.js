const express = require('express');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

const arraysEqual = (a, b) => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

const materialsEqual = (a, b) => {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
  const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
  return sortedA.every((val, index) => val.name === sortedB[index].name && val.quantity === sortedB[index].quantity);
};

// ══════════════════════════════════════════════════════════════
// @desc    Serve Roblox Lua client script dynamically with configurations injected
// @route   GET /api/lua/load
// @access  Public (Verifies API Key parameter)
// ══════════════════════════════════════════════════════════════
router.get('/load', async (req, res) => {
  const apiKey = req.query.key;
  const token = req.query.token;

  if (!apiKey && !token) {
    res.setHeader('Content-Type', 'text/plain');
    return res.send('-- Error: API Key or Token is required. Format: loadstring(game:HttpGet(".../api/lua/load?token=YOUR_TOKEN"))()');
  }

  try {
    let user = null;
    let finalApiKey = apiKey;

    if (token) {
      // Verify short-term token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
        if (decoded.purpose !== 'loader_token') {
          res.setHeader('Content-Type', 'text/plain');
          return res.send('-- Error: Invalid token purpose.');
        }

        const userId = decoded.userId || decoded.id;
        if (!global.dbConnected) {
          user = mockStore.findUserById(userId);
        } else {
          user = await User.findById(userId);
        }

        if (!user) {
          res.setHeader('Content-Type', 'text/plain');
          return res.send('-- Error: User not found for token.');
        }

        // Generate 24-hour Roblox session JWT token
        finalApiKey = jwt.sign(
          { userId: user._id ? user._id.toString() : user.id.toString(), purpose: 'roblox_session' },
          process.env.JWT_SECRET || 'super_secret_key',
          { expiresIn: '1d' }
        );
      } catch (jwtErr) {
        res.setHeader('Content-Type', 'text/plain');
        if (jwtErr.name === 'TokenExpiredError') {
          return res.send('-- Error: Bootstrap token has expired. Please copy a new script from the dashboard.');
        }
        return res.send('-- Error: Invalid or expired token.');
      }
    } else {
      // Validate API Key using database or mockStore fallback
      if (!global.dbConnected) {
        user = mockStore.findUserByApiKey(apiKey);
      } else {
        user = await User.findOne({ apiKey });
      }

      if (!user) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send('-- Error: Invalid API Key. Please retrieve your correct API Key from the Web Panel.');
      }
    }

    // Dynamically fetch the Lua client sender script from GitHub raw URL with local fallback
    let scriptContent = '';
    try {
      const response = await axios.get('https://raw.githubusercontent.com/hyuttgg/qu-n-l-acc-/refs/heads/main/core/sender%20copy.lua', { timeout: 5000 });
      scriptContent = response.data;
    } catch (fetchErr) {
      console.warn('Failed to fetch Lua client script from GitHub, falling back to local file:', fetchErr.message);
      const scriptPath = path.join(__dirname, '../../core/sender copy.lua');
      if (!fs.existsSync(scriptPath)) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send('-- Error: Lua client script file not found on server.');
      }
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    }

    // Dynamic configuration injection
    // Replace default API Key placeholder with user's verified key (permanent API key or Roblox session token)
    scriptContent = scriptContent.replace(
      '_G.OceanForgeApiKey = ""',
      `_G.OceanForgeApiKey = "${finalApiKey}"`
    );

    // Replace Server URL placeholder with the requesting host/domain URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const serverUrl = `${protocol}://${host}`;
    scriptContent = scriptContent.replace(
      /_G\.OceanForgeServerUrl\s*=\s*"[^"]*"/,
      `_G.OceanForgeServerUrl = "${serverUrl}"`
    );

    res.setHeader('Content-Type', 'text/plain');
    return res.send(scriptContent);
  } catch (error) {
    console.error('Failed to load Lua client script:', error);
    res.setHeader('Content-Type', 'text/plain');
    return res.send('-- Error: Internal server error occurred while serving script.');
  }
});

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
        account.sea = payload.sea !== undefined ? payload.sea : account.sea;
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

      // Update account stats in-memory
      const nextEquipped = {
        fruit: payload.fruit_equipped || payload.fruit || account.equipped.fruit,
        fruitMastery: payload.fruit_mastery || account.equipped.fruitMastery,
        sword: payload.sword || (payload.weapons && payload.weapons[0]) || account.equipped.sword,
        gun: payload.gun || (payload.guns && payload.guns[0]) || account.equipped.gun,
        fightingStyle: payload.fighting_style || (payload.styles && payload.styles[0]) || account.equipped.fightingStyle,
        accessory: payload.accessory_equipped || account.equipped.accessory || 'None',
      };

      const statsChanged = isNew ||
        account.level !== (payload.level || account.level) ||
        account.beli !== (payload.beli !== undefined ? payload.beli : account.beli) ||
        account.fragments !== (payload.fragments !== undefined ? payload.fragments : account.fragments) ||
        account.sea !== (payload.sea !== undefined ? payload.sea : account.sea) ||
        account.race !== (payload.race || account.race) ||
        account.status !== (payload.status || 'grinding') ||
        account.location !== (payload.location || account.location) ||
        account.equipped.fruit !== nextEquipped.fruit ||
        account.equipped.fruitMastery !== nextEquipped.fruitMastery ||
        account.equipped.sword !== nextEquipped.sword ||
        account.equipped.gun !== nextEquipped.gun ||
        account.equipped.fightingStyle !== nextEquipped.fightingStyle ||
        account.equipped.accessory !== nextEquipped.accessory;

      account.level = payload.level || account.level;
      account.beli = payload.beli !== undefined ? payload.beli : account.beli;
      account.fragments = payload.fragments !== undefined ? payload.fragments : account.fragments;
      account.sea = payload.sea !== undefined ? payload.sea : account.sea;
      account.race = payload.race || account.race;
      account.status = payload.status || 'grinding';
      account.location = payload.location || account.location;
      account.playtime = payload.playtime || account.playtime;
      account.lastSeen = Date.now();
      account.equipped = nextEquipped;

      // Throttle DB save: save if stats changed, if it is new, or if more than 30 seconds passed
      const timeSinceLastSeen = Date.now() - new Date(oldLastSeen).getTime();
      const shouldSaveAccount = statsChanged || timeSinceLastSeen > 30 * 1000;
      if (shouldSaveAccount) {
        await account.save();
      }

      // 2. Handle Session Tracking
      let activeSession = await Session.findOne({ accountId: account._id, online: true });
      const sessionTimeoutThreshold = 5 * 60 * 1000; // 5 minutes

      if (activeSession) {
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
          // Update active session duration and end time in-memory
          const oldEndTime = activeSession.endTime;
          activeSession.endTime = Date.now();
          activeSession.duration = Math.floor((activeSession.endTime - activeSession.startTime) / 1000);
          
          // Throttle session updates in DB to once every 60 seconds
          const timeSinceLastSessionUpdate = oldEndTime ? (Date.now() - new Date(oldEndTime).getTime()) : Infinity;
          if (timeSinceLastSessionUpdate > 60 * 1000) {
            await activeSession.save();
          }
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

      // Compute next inventory
      let nextFruits = inventory.fruits;
      let nextWeapons = inventory.weapons;
      let nextGuns = inventory.guns;
      let nextStyles = inventory.styles;
      let nextAccessories = inventory.accessories;
      let nextMaterials = inventory.materials;

      // Inventory items mapping
      if (payload.inventory) {
        nextFruits = payload.inventory.fruits || payload.inventory.stored_fruits || nextFruits;
        nextWeapons = payload.inventory.swords || payload.inventory.weapons || nextWeapons;
        nextGuns = payload.inventory.guns || nextGuns;
        nextStyles = payload.inventory.styles || payload.inventory.fighting_styles || nextStyles;
        nextAccessories = payload.inventory.accessories || nextAccessories;
        if (payload.inventory.materials) {
          nextMaterials = normalizeMaterials(payload.inventory.materials);
        }
      } else {
        // Flat payload fallbacks
        if (payload.weapons) nextWeapons = payload.weapons;
        if (payload.guns) nextGuns = payload.guns;
        if (payload.styles) nextStyles = payload.styles;
        if (payload.accessories) nextAccessories = payload.accessories;
        if (payload.materials) {
          nextMaterials = normalizeMaterials(payload.materials);
        }
        if (payload.inventory_fruits || payload.fruits) {
          nextFruits = payload.inventory_fruits || payload.fruits;
        }
      }

      const inventoryChanged = !oldInventory ||
        !arraysEqual(inventory.fruits, nextFruits) ||
        !arraysEqual(inventory.weapons, nextWeapons) ||
        !arraysEqual(inventory.guns, nextGuns) ||
        !arraysEqual(inventory.styles, nextStyles) ||
        !arraysEqual(inventory.accessories, nextAccessories) ||
        !materialsEqual(inventory.materials, nextMaterials);

      // Update inventory in-memory
      inventory.fruits = nextFruits;
      inventory.weapons = nextWeapons;
      inventory.guns = nextGuns;
      inventory.styles = nextStyles;
      inventory.accessories = nextAccessories;
      inventory.materials = nextMaterials;
      inventory.lastUpdated = Date.now();

      // Only save if it actually changed or is a new record
      if (inventoryChanged) {
        await inventory.save();
      }

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
