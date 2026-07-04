const rateLimit = require('express-rate-limit');
const config = require('../config/security.config');

/**
 * General rate limiter — applied globally
 * Prevents API scraping, DoS, and resource exhaustion
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: { success: false, message: config.rateLimits.general.message },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter — applied to /login and /register
 * Prevents brute force and credential stuffing
 * Uses IP-based keying (default) to avoid IPv6 validation issues
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: { success: false, message: config.rateLimits.auth.message },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP-based key generator (handles IPv6 correctly)
});

/**
 * Lua API rate limiter — applied to /api/lua/*
 * Prevents VM/phone farm spam from overwhelming the server
 * Keys by x-api-key header to rate-limit per Lua sender identity
 */
const luaLimiter = rateLimit({
  windowMs: config.rateLimits.lua.windowMs,
  max: config.rateLimits.lua.max,
  message: { success: false, message: config.rateLimits.lua.message },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by API key only (not IP) to avoid IPv6 validation issue
    return req.headers['x-api-key'] || 'anonymous';
  }
});

module.exports = { generalLimiter, authLimiter, luaLimiter };
