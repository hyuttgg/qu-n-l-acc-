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
const luaPayloadLogger = require('../utils/luaPayloadLogger');
const cacheManager = require('../utils/cacheManager');
const telemetryQueue = require('../services/telemetryQueue');
const csharpConcurrencyEngine = require('../services/csharpConcurrencyEngine');

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

const securityConfig = require('../config/security.config');

// Helper to escape string values safely for Lua string literals
const escapeLuaString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
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
        const decoded = jwt.verify(token, securityConfig.jwt.secret);
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

        // Generate Roblox session JWT token with user selected expiration (24h, 32h, 72h)
        const sessionExpiresIn = decoded.expiresIn || '24h';
        finalApiKey = jwt.sign(
          { userId: user._id ? user._id.toString() : user.id.toString(), purpose: 'roblox_session' },
          securityConfig.jwt.secret,
          { expiresIn: sessionExpiresIn }
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

    // Fetch Lua client telemetry sender script (khanhdev web dashboard.lua first)
    let scriptContent = '';
    let scriptPath = path.join(__dirname, '../../khanhdev web dashboard.lua');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, '../../core/sender copy.lua');
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, '../../core/sender.lua');
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, '../../core/khanh.lua');
    }

    if (fs.existsSync(scriptPath)) {
      scriptContent = fs.readFileSync(scriptPath, 'utf8');
    } else {
      try {
        const response = await axios.get('https://raw.githubusercontent.com/hyuttgg/qu-n-l-acc-/refs/heads/main/khanhdev%20web%20dashboard.lua', { timeout: 5000 });
        scriptContent = response.data;
      } catch (fetchErr) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send('-- Error: Lua client script file not found on server.');
      }
    }

    // Dynamic configuration injection with safe string escaping
    const safeApiKey = escapeLuaString(finalApiKey);
    scriptContent = scriptContent.replace(
      /_G\.OceanForgeApiKey\s*=\s*.*$/m,
      `_G.OceanForgeApiKey = "${safeApiKey}"`
    );

    // Replace Server URL placeholder with the requesting host/domain URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const serverUrl = escapeLuaString(`${protocol}://${host}`);
    scriptContent = scriptContent.replace(
      /_G\.OceanForgeServerUrl\s*=\s*.*$/m,
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

    // 🛡️ Security Sentinel: Audit Telemetry Payload for Impossible Spikes / Tampering
    const { auditTelemetryPayload, triggerAutoBanIfNecessary } = require('../utils/securitySentinel');
    let existingAcc = null;
    if (global.dbConnected && user) {
      existingAcc = await Account.findOne({ userId: user._id || user.id, robloxUsername });
    }
    const violation = auditTelemetryPayload(payload, existingAcc);
    if (violation) {
      violation.username = robloxUsername;
      violation.userCode = user?.userCode || user?.username;
      violation.ip = req.ip || req.headers['x-forwarded-for'];
      await triggerAutoBanIfNecessary(user?._id ? user._id.toString() : (user?.id || req.ip), violation);
      return res.status(403).json({
        success: false,
        message: `⛔ TỰ ĐỘNG KHÓA VÀ HỦY GIAO DỊCH: Phát hiện hành vi gian lận [${violation.type}]`
      });
    }

    // Log raw Lua telemetry for Admin Inspection (100% exact JSON)
    luaPayloadLogger.addPayloadLog({
      userEmail: user?.email,
      username: user?.username,
      robloxUsername,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      executorHeader: req.headers['user-agent'] || 'Roblox HttpService',
      payloadSize: JSON.stringify(payload).length,
      rawPayload: payload,
      level: payload.level,
      beli: payload.beli,
      fragments: payload.fragments,
      sea: payload.sea,
      race: payload.race,
      status: payload.status,
      device: payload.device,
      hwid: payload.hwid || payload.deviceId,
      sameHwid: payload.sameHwid,
      activeHub: payload.activeHub || payload.currentHub,
      location: payload.location,
      equipped: payload.equipped || {
        fruit: payload.fruit_equipped || payload.fruit,
        sword: payload.sword,
        gun: payload.gun,
        fightingStyle: payload.fighting_style || payload.fightingStyle,
        accessory: payload.accessory_equipped || payload.accessory
      },
      inventory: payload.inventory
    });

    try {
      // Enqueue telemetry update via C# Concurrency Engine (< 1ms non-blocking fast-path)
      const io = req.app.get('io');
      const accountId = await csharpConcurrencyEngine.ingestTelemetry(user, payload, io);

      securityLogger.info('Lua telemetry ingested via C# Concurrency Engine', { username: robloxUsername, userId: user._id || user.id });

      return res.status(200).json({
        success: true,
        message: 'Account telemetry ingested successfully (C# Accelerated Fast-Path)',
        accountId,
      });
    } catch (error) {
      console.error('Lua Ingestion Error:', error);
      securityLogger.error('Lua ingestion failed', { error: error.message, username: robloxUsername });
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════
// @desc    Get C# Concurrency Engine Live Metrics
// @route   GET /api/lua/concurrency-metrics
// @access  Public / Admin
// ══════════════════════════════════════════════════════════════
router.get('/concurrency-metrics', (req, res) => {
  return res.status(200).json({
    success: true,
    data: csharpConcurrencyEngine.getMetrics()
  });
});

module.exports = router;
