const crypto = require('crypto');
const config = require('../config/security.config');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');

// ───── In-memory nonce cache (use Redis in production) ─────
const nonceCache = new Map();

// Prune expired nonces every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of nonceCache.entries()) {
    if (now > expiry) nonceCache.delete(nonce);
  }
}, 30 * 1000);

/**
 * Verify Lua requests from Roblox using HMAC-SHA256 signature
 * ─────────────────────────────────────────────────────────────
 * Required headers:
 *   x-api-key     — User's API key (used as HMAC secret)
 *   x-signature   — HMAC-SHA256(payload + timestamp + nonce, apiKey)
 *   x-timestamp   — Unix epoch seconds when request was signed
 *   x-nonce       — Unique random string per request
 *
 * Protects against: fake senders, replay attacks, payload tampering
 */
const verifyLuaSignature = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const signature = req.headers['x-signature'];
  const timestampHeader = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];

  // 1. Check required headers
  if (!apiKey || !signature || !timestampHeader || !nonce) {
    return res.status(401).json({
      success: false,
      message: 'Missing security headers. Required: x-api-key, x-signature, x-timestamp, x-nonce'
    });
  }

  // 2. Timestamp drift check (replay protection)
  const timestamp = parseInt(timestampHeader, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const drift = Math.abs(nowSeconds - timestamp);

  if (isNaN(timestamp) || drift > config.luaSignature.driftToleranceSeconds) {
    return res.status(400).json({
      success: false,
      message: `Request expired. Time drift ${drift}s exceeds ${config.luaSignature.driftToleranceSeconds}s tolerance.`
    });
  }

  // 3. Nonce uniqueness check (replay protection)
  if (nonceCache.has(nonce)) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate nonce. Replay attack blocked.'
    });
  }
  nonceCache.set(nonce, Date.now() + (config.luaSignature.nonceCacheExpirySeconds * 1000));

  try {
    // 4. Authenticate API key
    let user;
    if (!global.dbConnected) {
      user = mockStore.findUserByApiKey(apiKey);
    } else {
      user = await User.findOne({ apiKey });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }

    // 5. Verify HMAC-SHA256 signature
    const payloadStr = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body);
    const message = `${payloadStr}${timestampHeader}${nonce}`;

    const computedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(message)
      .digest('hex');

    // 6. Timing-safe comparison (prevents side-channel attacks)
    const bufComputed = Buffer.from(computedSignature, 'hex');
    const bufReceived = Buffer.from(signature, 'hex');

    if (bufComputed.length !== bufReceived.length || !crypto.timingSafeEqual(bufComputed, bufReceived)) {
      return res.status(401).json({
        success: false,
        message: 'Signature mismatch. Payload may have been tampered with.'
      });
    }

    req.apiUser = user;
    next();
  } catch (error) {
    console.error('[LuaSignature] Verification error:', error);
    return res.status(500).json({ success: false, message: 'Signature verification error.' });
  }
};

module.exports = { verifyLuaSignature };
