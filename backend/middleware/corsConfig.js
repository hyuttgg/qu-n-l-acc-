const cors = require('cors');
const config = require('../config/security.config');

/**
 * CORS Configuration
 * ───────────────────
 * Restricts API access to whitelisted origins only.
 * Allows non-browser clients (Roblox HttpService, curl) which send no Origin header.
 */
module.exports = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Lua HttpService, mobile apps, curl)
    if (!origin) return callback(null, true);

    const cleanOriginStr = origin.trim().replace(/[\r\n\t]/g, '');
    const isAllowed = 
      config.cors.allowedOrigins.some(allowed => cleanOriginStr.startsWith(allowed)) ||
      cleanOriginStr.endsWith('.vercel.app') ||
      cleanOriginStr.includes('manageblox.io.vn') ||
      cleanOriginStr.includes('localhost') ||
      cleanOriginStr.includes('127.0.0.1');

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: "${origin}"`);
      return callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'x-api-key', 'x-signature', 'x-timestamp', 'x-nonce',
    'x-device-id', 'x-csrf-token', 'x-admin-passcode'
  ],
  credentials: true,
  optionsSuccessStatus: 200
});
