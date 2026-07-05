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

    if (config.cors.allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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
    'x-device-id', 'x-csrf-token'
  ],
  credentials: true,
  optionsSuccessStatus: 200
});
