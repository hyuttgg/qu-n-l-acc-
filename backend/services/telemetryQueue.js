const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');
const cacheManager = require('../utils/cacheManager');

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

class TelemetryQueue {
  constructor() {
    this.pendingQueue = new Map(); // Key: `${userId}:${robloxUsername}` -> latest payload & metadata
    this.lastSeenDbCache = new Map(); // Key: `${userId}:${robloxUsername}` -> timestamp of last db write
    this.flushIntervalMs = 2000;   // Batch flush to DB every 2 seconds
    this.timer = null;
    this.isFlushing = false;
    this.startAutoFlush();
  }

  startAutoFlush() {
    if (!this.timer) {
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  stopAutoFlush() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * ⚡ Touch Heartbeat (< 0.05ms) for Microsecond Deduplicated Telemetry
   * Updates RAM Cache & Socket.io without queueing heavy MongoDB disk writes (Account, Session, Inventory).
   */
  async touchHeartbeat(user, payload, io) {
    const robloxUsername = payload.username || payload.roblox_username;
    const userId = user._id ? user._id.toString() : user.id.toString();
    const key = `${userId}:${robloxUsername}`;
    const cacheKey = `account:${userId}:${robloxUsername}`;
    const now = new Date();

    // 1. Fast RAM Cache update (< 0.05ms)
    const cachedAccount = await cacheManager.get(cacheKey);
    if (cachedAccount) {
      cachedAccount.lastSeen = now;
      cachedAccount.status = payload.status || cachedAccount.status || 'grinding';
      await cacheManager.set(cacheKey, cachedAccount, 600);
    }

    // 2. In-memory Mock fallback (if DB disconnected)
    if (!global.dbConnected) {
      let account = mockStore.findAccountByRobloxName(userId, robloxUsername);
      if (account) {
        account.lastSeen = now;
        account.status = payload.status || account.status;
        if (io) {
          io.to(userId).emit('account_heartbeat', {
            key,
            userId,
            robloxUsername,
            status: account.status,
            lastSeen: now,
            isDeduplicated: true
          });
        }
        return account.id;
      }
    }

    // 3. Throttled lightweight DB update (once every 3 minutes max) to save MongoDB Atlas disk I/O
    const lastDbUpdate = this.lastSeenDbCache.get(key) || 0;
    if (Date.now() - lastDbUpdate > 180000) { // 3 minutes throttle
      this.lastSeenDbCache.set(key, Date.now());
      Account.updateOne(
        { userId, robloxUsername },
        { $set: { lastSeen: now, status: payload.status || 'grinding' } }
      ).catch((err) => console.error('[TelemetryQueue] Heartbeat updateOne error:', err.message));
    }

    // 4. Emit instant Socket.io heartbeat update (< 0.05ms)
    if (io) {
      io.to(userId).emit('account_heartbeat', {
        key,
        userId,
        robloxUsername,
        status: payload.status || 'grinding',
        location: payload.location || 'Starter Island',
        lastSeen: now,
        isDeduplicated: true
      });
    }

    return key;
  }

  /**
   * Enqueue telemetry payload for fast, non-blocking ingestion
   */
  async enqueueUpdate(user, payload, io) {
    const robloxUsername = payload.username || payload.roblox_username;
    const userId = user._id ? user._id.toString() : user.id.toString();
    const key = `${userId}:${robloxUsername}`;

    // Cache latest account state in CacheManager (Redis/RAM) for sub-ms reads
    const cacheKey = `account:${userId}:${robloxUsername}`;

    const eqPayload = payload.equipped || {};
    const equippedObj = {
      fruit: payload.fruit_equipped || payload.fruit || eqPayload.fruit || 'None',
      fruitMastery: payload.fruit_mastery !== undefined ? payload.fruit_mastery : (eqPayload.fruitMastery !== undefined ? eqPayload.fruitMastery : 0),
      sword: payload.sword || payload.equipped_sword || eqPayload.sword || (payload.weapons && payload.weapons[0]) || 'None',
      gun: payload.gun || payload.equipped_gun || eqPayload.gun || (payload.guns && payload.guns[0]) || 'None',
      fightingStyle: payload.fighting_style || payload.fightingStyle || payload.equipped_melee || eqPayload.fightingStyle || (payload.styles && payload.styles[0]) || 'Combat',
      accessory: payload.accessory_equipped || payload.accessory || eqPayload.accessory || 'None',
    };

    const telemetryItem = {
      userId,
      user,
      robloxUsername,
      payload,
      equippedObj,
      timestamp: Date.now(),
    };

    this.pendingQueue.set(key, telemetryItem);

    // Update Cache immediately
    await cacheManager.set(cacheKey, {
      userId,
      robloxUsername,
      level: payload.level || 1,
      beli: payload.beli !== undefined ? payload.beli : 0,
      fragments: payload.fragments !== undefined ? payload.fragments : 0,
      sea: payload.sea !== undefined ? payload.sea : 1,
      race: payload.race || 'Human',
      status: payload.status || 'grinding',
      location: payload.location || 'Starter Island',
      equipped: equippedObj,
      lastSeen: new Date(),
    }, 600); // 10 min TTL

    // In-memory Mock fallback handling
    if (!global.dbConnected) {
      let account = mockStore.findAccountByRobloxName(userId, robloxUsername);
      if (!account) {
        account = mockStore.createAccount(userId, robloxUsername);
      }
      account.level = payload.level || account.level;
      account.beli = payload.beli !== undefined ? payload.beli : account.beli;
      account.fragments = payload.fragments !== undefined ? payload.fragments : account.fragments;
      account.sea = payload.sea !== undefined ? payload.sea : account.sea;
      account.race = payload.race || account.race;
      account.status = payload.status || 'grinding';
      account.location = payload.location || account.location;
      account.equipped = equippedObj;
      account.lastSeen = new Date();

      let activeSession = mockStore.findActiveSession(account.id);
      if (!activeSession) {
        activeSession = mockStore.createSession(account.id);
      }

      let inventory = mockStore.findInventory(account.id);
      if (!inventory) {
        inventory = mockStore.createInventory(account.id);
      }

      if (io) {
        io.to(userId).emit('account_update', { account, inventory, activeSession });
      }
      return account.id;
    }

    // Emit Socket.io update immediately without waiting for MongoDB write
    if (io) {
      io.to(userId).emit('account_update', {
        account: {
          userId,
          robloxUsername,
          level: payload.level || 1,
          beli: payload.beli !== undefined ? payload.beli : 0,
          fragments: payload.fragments !== undefined ? payload.fragments : 0,
          sea: payload.sea !== undefined ? payload.sea : 1,
          race: payload.race || 'Human',
          status: payload.status || 'grinding',
          location: payload.location || 'Starter Island',
          equipped: equippedObj,
          lastSeen: new Date(),
        },
        fastPath: true
      });
    }

    return key;
  }

  /**
   * Flush pending items to MongoDB in bulk
   */
  async flush() {
    if (this.isFlushing || this.pendingQueue.size === 0 || !global.dbConnected) {
      return;
    }

    this.isFlushing = true;
    const itemsToProcess = Array.from(this.pendingQueue.values());
    this.pendingQueue.clear();

    try {
      for (const item of itemsToProcess) {
        const { userId, robloxUsername, payload, equippedObj } = item;

        // 1. Account find & update
        let account = await Account.findOne({ userId, robloxUsername });
        let isNew = false;
        let oldLevel = 1;

        if (!account) {
          account = new Account({ userId, robloxUsername });
          isNew = true;
        } else {
          oldLevel = account.level;
        }

        account.level = payload.level || account.level;
        account.beli = payload.beli !== undefined ? payload.beli : account.beli;
        account.fragments = payload.fragments !== undefined ? payload.fragments : account.fragments;
        account.sea = payload.sea !== undefined ? payload.sea : account.sea;
        account.race = payload.race || account.race;
        account.status = payload.status || 'grinding';
        account.location = payload.location || account.location;
        account.playtime = payload.playtime || account.playtime;
        const currentHwid = payload.hwid || payload.deviceId || payload.androidId || account.hwid || '';
        const activeHub = payload.activeHub || payload.currentHub || payload.hub || account.activeHub || 'None';

        account.device = payload.device || account.device || '';
        account.deviceId = currentHwid;
        account.androidId = payload.androidId || payload.deviceId || account.androidId || '';
        account.hwid = currentHwid;
        account.activeHub = activeHub;

        // Check for same HWID across accounts
        if (currentHwid && currentHwid !== '' && currentHwid !== 'Unknown_Device') {
          try {
            const sameHwidMatches = await Account.find({
              userId,
              $or: [{ hwid: currentHwid }, { deviceId: currentHwid }],
              _id: { $ne: account._id }
            }).select('robloxUsername');

            if (sameHwidMatches && sameHwidMatches.length > 0) {
              const matchedUsernames = sameHwidMatches.map(a => a.robloxUsername);
              account.sameHwid = true;
              account.sameHwidCount = matchedUsernames.length + 1;
              account.sameHwidAccounts = [robloxUsername, ...matchedUsernames];

              Account.updateMany(
                { userId, $or: [{ hwid: currentHwid }, { deviceId: currentHwid }] },
                { $set: { sameHwid: true, sameHwidCount: matchedUsernames.length + 1 } }
              ).catch(() => {});
            } else {
              account.sameHwid = false;
              account.sameHwidCount = 1;
              account.sameHwidAccounts = [robloxUsername];
            }
          } catch (hwidErr) {
            console.error('[TelemetryQueue] HWID match check error:', hwidErr.message);
          }
        }

        account.lastSeen = Date.now();
        account.equipped = equippedObj;
        account.markModified('equipped');

        await account.save();

        // 2. Session tracking
        let activeSession = await Session.findOne({ accountId: account._id, online: true });
        if (!activeSession) {
          activeSession = await Session.create({
            accountId: account._id,
            startTime: Date.now(),
            online: true,
          });
        } else {
          activeSession.endTime = Date.now();
          activeSession.duration = Math.floor((activeSession.endTime - activeSession.startTime) / 1000);
          await activeSession.save();
        }

        // 3. Inventory update
        let inventory = await Inventory.findOne({ accountId: account._id });
        if (!inventory) {
          inventory = new Inventory({ accountId: account._id });
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
        inventory.lastUpdated = Date.now();
        await inventory.save();

        // 4. Log creation
        if (!isNew && account.level > oldLevel) {
          await Log.create({
            accountId: account._id,
            type: 'level_up',
            description: `Leveled up from ${oldLevel} to ${account.level}`,
          });
        }

        // 5. Broadcast complete saved account with valid _id to Socket.io subscribers
        if (item.io) {
          item.io.to(userId).emit('account_update', {
            account: account.toObject(),
            inventory: inventory ? inventory.toObject() : null,
            activeSession: activeSession ? activeSession.toObject() : null
          });
        }
      }
    } catch (err) {
      console.error('[TelemetryQueue] Flush error:', err.message);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Graceful shutdown flush
   */
  async shutdown() {
    this.stopAutoFlush();
    if (this.pendingQueue.size > 0) {
      console.log(`[TelemetryQueue] Flushing ${this.pendingQueue.size} pending telemetry records before shutdown...`);
      await this.flush();
    }
  }
}

const telemetryQueue = new TelemetryQueue();
module.exports = telemetryQueue;
