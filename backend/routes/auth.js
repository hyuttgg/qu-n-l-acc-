const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

// ───── Security Middleware ─────
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');

const router = express.Router();

// Helper to sign JWT
const getSignedJwtToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_key', {
    expiresIn: '7d',
  });
};

// @desc    Register a user
// @route   POST /api/auth/register
// @access  Public
// Security: authLimiter (10 req/15 min) + Zod validation
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      let user = mockStore.findUserByEmail(email) || mockStore.findUserByUsername(username);
      if (user) {
        return res.status(400).json({ success: false, message: 'Username or Email already registered' });
      }

      user = mockStore.createUser(username, email, password);
      const token = getSignedJwtToken(user.id);

      securityLogger.info('User registered (mock)', { username, email });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          apiKey: user.apiKey,
        },
      });
    }

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username or Email already registered' });
    }

    user = await User.create({
      username,
      email,
      password,
    });

    const token = getSignedJwtToken(user._id);

    securityLogger.info('User registered', { username, email });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// Security: authLimiter (10 req/15 min) + Zod validation
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserByEmail(email);
      if (!user || user.password !== password) {
        securityLogger.warn('Failed login attempt (mock)', { email, ip: req.ip });
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = getSignedJwtToken(user.id);

      securityLogger.info('User logged in (mock)', { email });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          apiKey: user.apiKey,
        },
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      securityLogger.warn('Failed login attempt: user not found', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      securityLogger.warn('Failed login attempt: wrong password', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = getSignedJwtToken(user._id);

    securityLogger.info('User logged in', { email, userId: user._id });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// @desc    Regenerate user API key
// @route   POST /api/auth/regenerate-key
// @access  Private
router.post('/regenerate-key', protect, async (req, res) => {
  try {
    const newApiKey = 'forge_' + crypto.randomBytes(24).toString('hex');
    
    securityLogger.info('API key regenerated', { userId: req.user._id || req.user.id });

    if (!global.dbConnected) {
      req.user.apiKey = newApiKey;
      return res.status(200).json({
        success: true,
        apiKey: newApiKey,
      });
    }

    req.user.apiKey = newApiKey;
    await req.user.save();

    res.status(200).json({
      success: true,
      apiKey: newApiKey,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
