const cors = require('cors');
const config = require('../config/security.config');

/**
 * CORS options configuration
 * Restricts access to a set of pre-configured domains,
 * and allows cookie transmission for CSRF & session verification.
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Lua Roblox servers)
    // Lua script sends requests via HttpService which do not carry a standard Browser origin header
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed whitelist
    if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`CORS Access Blocked: Origin "${origin}" is not in whitelist.`);
      return callback(new Error('Blocked by CORS policy (Unauthorized Origin)'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-api-key', 
    'x-signature', 
    'x-timestamp', 
    'x-nonce',
    'x-device-id',
    'x-csrf-token'
  ],
  credentials: true, // Allow cookies to be sent with requests (crucial for CSRF SameSite)
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

module.exports = cors(corsOptions);
