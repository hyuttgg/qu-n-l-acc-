const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

// ───── Security Middleware ─────
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema, updateEmailSchema, updatePasswordSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');
const authEmitter = require('../events/authEvents');

const router = express.Router();

// Helper to sign JWT
const getSignedJwtToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_key', {
    expiresIn: '7d',
  });
};

// Helper to get safe redirect URL (bulletproofs against missing http/https protocols in env configs)
const getRedirectUrl = (path = '') => {
  let baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  baseUrl = baseUrl.trim();
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  return `${baseUrl}${path}`;
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

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username or Email already registered' });
    }

    // IP Limit: Max 5 accounts per IP for standard registration
    const registrationCountOnIp = await User.countDocuments({ creationIp: ip });
    if (registrationCountOnIp >= 5) {
      return res.status(400).json({ success: false, message: 'Địa chỉ IP của bạn đã đăng ký quá số lượng tài khoản cho phép (Tối đa 5).' });
    }

    // Create user
    user = await User.create({
      username,
      email,
      password,
      creationIp: ip,
    });

    const token = getSignedJwtToken(user._id);

    securityLogger.info('New user registered successfully', { userId: user._id, username });

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
// Security: authLimiter + Zod validation
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = getSignedJwtToken(user.id);
      securityLogger.info('User logged in (mock)', { userId: user.id });

      // Emit login success event to record history
      authEmitter.emit('login.success', { user, req });

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
      securityLogger.warn('Failed login attempt: Email not found', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      securityLogger.warn('Failed login attempt: Incorrect password', { userId: user._id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = getSignedJwtToken(user._id);

    securityLogger.info('User logged in successfully', { userId: user._id });

    // Emit login success event to record history and send email notification
    authEmitter.emit('login.success', { user, req });

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

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id || req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        apiKey: req.user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Generate a short-lived loader token for Roblox script loading
// @route   POST /api/auth/loader-token
// @access  Private
router.post('/loader-token', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const token = jwt.sign(
      { userId: userId.toString(), purpose: 'loader_token' },
      process.env.JWT_SECRET || 'super_secret_key',
      { expiresIn: '24h' }
    );
    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update user email
// @route   PUT /api/auth/email
// @access  Private
router.put('/email', protect, validate(updateEmailSchema), async (req, res) => {
  const { email } = req.body;

  try {
    if (!global.dbConnected) {
      const user = mockStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.email = email;
      securityLogger.info('User email updated (mock)', { userId: user.id });
      return res.status(200).json({ success: true, message: 'Email updated successfully', email });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if new email is already taken
    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id.toString() !== user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Email is already in use' });
    }

    user.email = email;
    await user.save();

    securityLogger.info('User email updated', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, validate(updatePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!global.dbConnected) {
      const user = mockStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (user.password && user.password !== currentPassword) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
      user.password = newPassword;
      securityLogger.info('User password updated (mock)', { userId: user.id });
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password if user has one (OAuth users might not have a password initially)
    if (user.password) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
    }

    user.password = newPassword;
    await user.save(); // Password will be hashed by UserSchema pre('save') hook

    securityLogger.info('User password updated', { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// @desc    Auth with Discord
// @route   GET /api/auth/discord
// @access  Public
router.get('/discord', passport.authenticate('discord'));

// @desc    Discord auth callback
// @route   GET /api/auth/discord/callback
// @access  Public
router.get('/discord/callback', (req, res, next) => {
  passport.authenticate('discord', { session: false }, (err, user, info) => {
    if (err) {
      securityLogger.error('Discord OAuth callback error', { 
        error: err.message, 
        stack: err.stack,
        url: req.originalUrl 
      });
      if (err.message === 'ip_limit') {
        return res.redirect(getRedirectUrl(`/login?error=discord_ip_limit`));
      }
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed`));
    }
    if (!user) {
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed`));
    }
    
    try {
      const token = getSignedJwtToken(user._id || user.id);
      
      // Emit login success event to record history and send email notification
      authEmitter.emit('login.success', { user, req });

      res.redirect(getRedirectUrl(`/oauth-success?token=${token}`));
    } catch (error) {
      res.redirect(getRedirectUrl(`/login?error=oauth_failed`));
    }
  })(req, res, next);
});

// @desc    Auth with Google
// @route   GET /api/auth/google
// @access  Public
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /api/auth/google/callback
// @access  Public
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      securityLogger.error('Google OAuth callback error', { 
        error: err.message, 
        stack: err.stack,
        url: req.originalUrl 
      });
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed`));
    }
    if (!user) {
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed`));
    }
    
    // Successful authentication, redirect to frontend with JWT token
    const token = getSignedJwtToken(user._id || user.id);
    res.redirect(getRedirectUrl(`/login?token=${token}`));
  })(req, res, next);
});

module.exports = router;
