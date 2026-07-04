const rateLimit = require('express-rate-limit');
const config = require('../config/security.config');

/**
 * General rate limiter to prevent API scraping and denial of service (DoS)
 * Applied globally to regular Web client APIs
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: {
    success: false,
    message: config.rateLimits.general.message
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Auth rate limiter to protect login/register endpoints from brute force/credential stuffing
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: {
    success: false,
    message: config.rateLimits.auth.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to rate limit by IP + Username to prevent target-specific locking
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const identifier = req.body.email || req.body.username || 'unknown';
    return `${ip}_${identifier}`;
  }
});

/**
 * Lua API rate limiter specifically optimized for Roblox Client/Phone Farm VM nodes
 * Can limit requests per API key or per IP
 */
const luaLimiter = rateLimit({
  windowMs: config.rateLimits.lua.windowMs,
  max: config.rateLimits.lua.max,
  message: {
    success: false,
    message: config.rateLimits.lua.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator: prioritize Roblox API Key, fallback to client IP
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] || 'anonymous';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return `${apiKey}_${ip}`;
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  luaLimiter
};
