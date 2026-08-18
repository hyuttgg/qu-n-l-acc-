/**
 * Central Security Configuration
 * ================================
 * Pulls configuration values from environment variables
 * with secure, production-ready default values.
 *
 * All security middleware reads from this single file.
 */
module.exports = {
  env: process.env.NODE_ENV || 'development',

  // ───── Database Encryption Keys (AES-256-GCM) ─────
  dbEncryption: {
    key: process.env.DATABASE_ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    algorithm: 'aes-256-gcm',
  },

  // ───── JWT Configuration ─────
  jwt: {
    get secret() {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
      }
      return secret || 'super_secret_oceanforge_jwt_key_129847';
    },
    accessTokenExpiry: '15m',  // short-lived access tokens
    refreshTokenExpiry: '7d',  // longer refresh window
  },

  // ───── CORS Settings ─────
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'], // standard React dev ports
  },

  // ───── Rate Limiting (express-rate-limit) ─────
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // Increased from 100 to prevent false-positives under normal usage
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 30, // Increased from 10 to allow reasonable login/register attempts
      message: 'Too many authentication attempts, please try again after 15 minutes',
    },
    lua: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 2000, // Supports 50-100+ accounts sending high-frequency updates simultaneously
      message: 'Rate limit exceeded for Lua sender. Slow down your update loop.',
    }
  },

  // ───── Roblox Lua Signature & Replay Protection ─────
  luaSignature: {
    driftToleranceSeconds: parseInt(process.env.LUA_DRIFT_TOLERANCE || '30', 10),
    nonceCacheExpirySeconds: parseInt(process.env.LUA_NONCE_EXPIRY || '60', 10),
  },

  // ───── Secure Cookie settings ─────
  cookies: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }
};
