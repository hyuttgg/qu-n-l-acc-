const crypto = require('crypto');
const config = require('../config/security.config');
const User = require('../../backend/models/User'); // Path to existing backend User model
const mockStore = require('../../backend/utils/mockStore'); // Path to existing backend mockStore

// Simple in-memory cache to store used nonces.
// In production, you would typically use Redis with a TTL of 60 seconds.
const nonceCache = new Map();

// Helper to periodically prune expired nonces from memory
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of nonceCache.entries()) {
    if (now > expiry) {
      nonceCache.delete(nonce);
    }
  }
}, 30 * 1000); // Prune every 30 seconds

/**
 * Middleware to cryptographically verify Lua requests from Roblox.
 * Ensures authenticity (HMAC), integrity (payload hash), and replay protection (timestamp + nonce).
 */
const verifyLuaSignature = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const signature = req.headers['x-signature'];
  const timestampHeader = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];

  // 1. Check for required cryptographic headers
  if (!apiKey || !signature || !timestampHeader || !nonce) {
    return res.status(401).json({
      success: false,
      message: 'Missing security headers. x-api-key, x-signature, x-timestamp, and x-nonce are required.'
    });
  }

  // 2. Replay Protection: Verify Timestamp (Time-drift check)
  const timestamp = parseInt(timestampHeader, 10);
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const drift = Math.abs(nowInSeconds - timestamp);

  if (isNaN(timestamp) || drift > config.luaSignature.driftToleranceSeconds) {
    return res.status(400).json({
      success: false,
      message: `Request expired. Time drift (${drift}s) exceeds tolerance window of ${config.luaSignature.driftToleranceSeconds}s. Synchronize your client time.`
    });
  }

  // 3. Replay Protection: Verify Nonce (Double-spend check)
  if (nonceCache.has(nonce)) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate request detected. Nonce replay blocked.'
    });
  }

  // Cache nonce (valid for twice the drift window to safely prevent replay)
  const nonceExpiry = Date.now() + (config.luaSignature.nonceCacheExpirySeconds * 1000);
  nonceCache.set(nonce, nonceExpiry);

  try {
    // 4. Authenticate User API Key
    let user;
    if (!global.dbConnected) {
      user = mockStore.findUserByApiKey(apiKey);
    } else {
      user = await User.findOne({ apiKey });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key. Authorization failed.'
      });
    }

    // 5. Signature Verification
    // Signable payload = Raw JSON payload string + Timestamp + Nonce
    // Note: The Lua sender must stringify their body identically (field order doesn't matter if stringified directly as payload)
    const payloadStr = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    const message = `${payloadStr}${timestampHeader}${nonce}`;
    
    // Generate HMAC-SHA256 signature using the API Key as the secret
    const computedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(message)
      .digest('hex');

    // 6. Timing-Safe Comparison to prevent side-channel timing attacks
    const bufferComputed = Buffer.from(computedSignature, 'hex');
    const bufferReceived = Buffer.from(signature, 'hex');

    if (bufferComputed.length !== bufferReceived.length || !crypto.timingSafeEqual(bufferComputed, bufferReceived)) {
      return res.status(401).json({
        success: false,
        message: 'Cryptographic signature mismatch. Payload may have been tampered with.'
      });
    }

    // Attach authorized user to request for use in the controller
    req.apiUser = user;
    next();
  } catch (error) {
    console.error('Lua Signature Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal cryptographic verification error.'
    });
  }
};

module.exports = {
  verifyLuaSignature
};
