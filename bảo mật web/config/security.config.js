/**
 * Central Security Configuration
 * This file pulls configuration values from environment variables
 * with secure, production-ready default values.
 */
module.exports = {
  env: process.env.NODE_ENV || 'development',

  // Database Encryption Keys (AES-256-GCM)
  // Ensure DATABASE_ENCRYPTION_KEY is exactly 32 bytes (256 bits) in production
  dbEncryption: {
    key: process.env.DATABASE_ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // Fallback for dev only!
    algorithm: 'aes-256-gcm',
  },

  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_key_129837192',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_key_84920492',
    accessTokenExpiry: '15m',  // short-lived access tokens
    refreshTokenExpiry: '7d',   // longer refresh window
  },

  // CORS Settings
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['https://yourdomain.com', 'http://localhost:3000', 'http://localhost:5173'], // standard React dev ports
  },

  // Rate Limiting (express-rate-limit)
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per window
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // Limit login/register attempts to 10 per 15 minutes
      message: 'Too many authentication attempts, please try again after 15 minutes',
    },
    lua: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // Limit Roblox Lua client update rate to 30 requests/min
      message: 'Rate limit exceeded for Lua sender. Slow down your update loop.',
    }
  },

  // Roblox Lua Signature & Replay Protection
  luaSignature: {
    driftToleranceSeconds: parseInt(process.env.LUA_DRIFT_TOLERANCE || '30', 10), // Allow 30 seconds of time drift
    nonceCacheExpirySeconds: parseInt(process.env.LUA_NONCE_EXPIRY || '60', 10), // Store nonces longer than tolerance window
  },

  // Secure Cookie settings
  cookies: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
  }
};
