const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');

// Protect routes for standard frontend users (JWT)
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
    
    // In-memory fallback
    if (!global.dbConnected) {
      req.user = mockStore.findUserById(decoded.id);
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      return next();
    }

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Authorize Lua scripts sending updates from Roblox (x-api-key)
exports.requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'Missing API key header (x-api-key)' });
  }

  try {
    // In-memory fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid API key' });
      }
      req.apiUser = user;
      return next();
    }

    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    req.apiUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'API key authorization failed' });
  }
};
