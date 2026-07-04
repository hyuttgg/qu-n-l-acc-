const jwt = require('jsonwebtoken');
const config = require('../config/security.config');
const User = require('../../backend/models/User'); // Path to existing backend User model
const mockStore = require('../../backend/utils/mockStore'); // Path to existing backend mockStore

/**
 * Middleware to protect routes and verify JWT Access Token
 * Also supports basic Device ID validation to block session replays
 */
exports.protect = async (req, res, next) => {
  let token;

  // Extract Bearer token from headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    // Verify Access Token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Validate optional device token/ID if present
    const clientDeviceId = req.headers['x-device-id'];
    if (decoded.deviceId && clientDeviceId && decoded.deviceId !== clientDeviceId) {
      return res.status(401).json({
        success: false,
        message: 'Session hijacked. Device mismatch detected.'
      });
    }

    // In-memory Mock fallback (from existing backend logic)
    if (!global.dbConnected) {
      req.user = mockStore.findUserById(decoded.id);
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authorized user no longer exists.' });
      }
      return next();
    }

    // Database lookup
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authorized user no longer exists.' });
    }

    // Attach user payload to request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        code: 'TOKEN_EXPIRED',
        message: 'Token expired. Please refresh your session.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token. Authorization denied.' 
    });
  }
};

/**
 * Middleware to authorize standard, unsigned Lua API Key updates
 * (For signed updates, use the luaSignature middleware instead)
 */
exports.requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'Missing API key header (x-api-key).' });
  }

  try {
    // In-memory fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid API key.' });
      }
      req.apiUser = user;
      return next();
    }

    // Database lookup
    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key.' });
    }
    
    req.apiUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'API key authorization failed.' });
  }
};
