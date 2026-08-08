const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');
const securityConfig = require('../config/security.config');

// ───── Security Middleware ─────
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema, updateEmailSchema, updatePasswordSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');
const authEmitter = require('../events/authEvents');
const router = express.Router();

// Helper to sign JWT
const getSignedJwtToken = (id) => {
  const userIdStr = id ? id.toString() : id;
  return jwt.sign({ id: userIdStr }, securityConfig.jwt.secret, {
    expiresIn: '7d',
  });
};

// Helper to get safe redirect URL (bulletproofs against missing http/https protocols in env configs)
const getRedirectUrl = (path = '') => {
  let baseUrl = process.env.FRONTEND_URL || 'https://oceanforge-web.pages.dev';
  baseUrl = baseUrl.trim();
  if (baseUrl.includes('manageblox.io.vn')) {
    baseUrl = 'https://oceanforge-web.pages.dev';
  }
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
          avatar: user.avatar || null,
        },
      });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username or Email already registered' });
    }

    // IP Limit: Max 5 accounts per IP for standard registration (exempt localhost for test/dev)
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip?.includes('127.0.0.1');
    if (!isLocalhost) {
      const registrationCountOnIp = await User.countDocuments({ creationIp: ip });
      if (registrationCountOnIp >= 5) {
        return res.status(400).json({ success: false, message: 'Địa chỉ IP của bạn đã đăng ký quá số lượng tài khoản cho phép (Tối đa 5).' });
      }
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
        avatar: user.avatar || null,
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
          avatar: user.avatar || null,
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
        avatar: user.avatar || null,
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
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'Member',
        apiKey: user.apiKey,
        avatar: user.avatar || null,
        discordId: user.discordId || null,
        discriminator: user.discriminator || '0',
        nickname: user.nickname || null,
        userCode: user.userCode || null,
        joinDate: user.joinDate || user.createdAt,
        lastLogin: user.lastLogin || new Date(),
        loginCount: user.loginCount || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update user internal nickname
// @route   PUT /api/auth/nickname
// @access  Private
router.put('/nickname', protect, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Biệt danh phải chứa ít nhất 2 ký tự' });
    }

    const cleanNickname = nickname.trim();

    if (!global.dbConnected) {
      const user = mockStore.findUserById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.nickname = cleanNickname;
      return res.status(200).json({ success: true, message: 'Cập nhật biệt danh thành công', nickname: cleanNickname });
    }

    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({ nickname: new RegExp(`^${escapeRegex(cleanNickname)}$`, 'i') });
    if (existing && existing._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Biệt danh này đã được người khác sử dụng' });
    }

    const user = await User.findById(req.user._id);
    user.nickname = cleanNickname;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật biệt danh thành công',
      nickname: user.nickname,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Generate a short-lived loader token for Roblox script loading with configurable expiration (24h, 32h, 72h)
// @route   POST /api/auth/loader-token
// @access  Private
router.post('/loader-token', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { expiresIn } = req.body || {};
    const validExpirations = ['24h', '32h', '72h'];
    const expiry = validExpirations.includes(expiresIn) ? expiresIn : '24h';

    const token = jwt.sign(
      { userId: userId.toString(), purpose: 'loader_token', expiresIn: expiry },
      securityConfig.jwt.secret,
      { expiresIn: expiry }
    );
    res.status(200).json({ success: true, token, expiresIn: expiry });
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

const getDynamicDiscordCallbackUrl = (req) => {
  if (process.env.DISCORD_CALLBACK_URL && process.env.DISCORD_CALLBACK_URL.trim()) {
    let url = process.env.DISCORD_CALLBACK_URL.trim();
    if (url.includes('manageblox.io.vn')) {
      url = url.replace(/api\.manageblox\.io\.vn|manageblox\.io\.vn/g, 'quan-ly-acc-viet-nam.onrender.com');
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!url.includes('/api/') && url.includes('/auth/')) {
      url = url.replace('/auth/', '/api/auth/');
    }
    return url;
  }
  const host = process.env.BACKEND_PUBLIC_URL || 'https://quan-ly-acc-viet-nam.onrender.com';
  return `${host.replace(/\/+$/, '')}/api/auth/discord/callback`;
};

// @desc    Auth with Discord
// @route   GET /api/auth/discord
// @access  Public
router.get('/discord', (req, res, next) => {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    console.error('❌ DISCORD OAUTH ERROR: DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET missing in .env');
    return res.redirect(getRedirectUrl('/login?error=discord_not_configured'));
  }
  const callbackURL = getDynamicDiscordCallbackUrl(req);
  passport.authenticate('discord', { callbackURL })(req, res, next);
});

// @desc    Discord auth callback
// @route   GET /api/auth/discord/callback
// @access  Public
router.get('/discord/callback', (req, res, next) => {
  const callbackURL = getDynamicDiscordCallbackUrl(req);
  passport.authenticate('discord', { callbackURL, session: false }, (err, user, info) => {
    if (err) {
      const errorMsg = err.oauthError ? (typeof err.oauthError === 'string' ? err.oauthError : JSON.stringify(err.oauthError)) : (err.message || String(err));
      console.error('❌ Discord OAuth Callback TokenError Details:', errorMsg);
      securityLogger.error('Discord OAuth callback error', {
        error: err.name || 'TokenError',
        details: errorMsg,
        stack: err.stack,
        url: req.originalUrl
      });
      if (err.message === 'ip_limit') {
        return res.redirect(getRedirectUrl(`/login?error=discord_ip_limit`));
      }
      const reason = encodeURIComponent(errorMsg.length > 80 ? errorMsg.substring(0, 80) : errorMsg);
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed&reason=${reason}`));
    }
    if (!user) {
      console.error('❌ Discord OAuth: User object not returned by strategy');
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed&reason=user_not_found`));
    }

    try {
      const token = getSignedJwtToken(user._id || user.id);

      // Emit login success event to record history and send email notification
      authEmitter.emit('login.success', { user, req });

      res.redirect(getRedirectUrl(`/oauth-success?token=${token}`));
    } catch (error) {
      console.error('❌ Discord JWT Signing Error:', error);
      return res.redirect(getRedirectUrl(`/login?error=oauth_failed&reason=jwt_sign_error`));
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
    authEmitter.emit('login.success', { user, req });
    res.redirect(getRedirectUrl(`/oauth-success?token=${token}`));
  })(req, res, next);
});

// @desc    Delete user account and all related data (Hard Delete from Database)
// @route   DELETE /api/auth/delete
// @access  Private
router.delete('/delete', protect, async (req, res) => {
  let session = null;
  try {
    const userId = req.user.id || req.user._id;

    // In-memory Mock fallback
    if (!global.dbConnected) {
      mockStore.deleteUser(userId);
      securityLogger.info('User account hard deleted from mock store', { userId });
      return res.status(200).json({ success: true, message: 'Account and all associated data deleted successfully' });
    }

    const AccountModel = require('../models/Account');
    const InventoryModel = require('../models/Inventory');
    const SessionModel = require('../models/Session');
    const LogModel = require('../models/Log');
    const LoginHistoryModel = require('../models/LoginHistory');
    const mongoose = require('mongoose');

    // Attempt ACID Transaction if MongoDB supports it (Replica Set / MongoDB Atlas)
    let transactionCommitted = false;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // 1. Find all Roblox accounts associated with this user
      const accounts = await AccountModel.find({ userId }).session(session);
      const accountIds = accounts.map((acc) => acc._id);

      // 2. Delete inventory records, sessions, and logs for those Roblox accounts
      if (accountIds.length > 0) {
        await Promise.all([
          InventoryModel.deleteMany({ accountId: { $in: accountIds } }).session(session),
          SessionModel.deleteMany({ accountId: { $in: accountIds } }).session(session),
          LogModel.deleteMany({ accountId: { $in: accountIds } }).session(session),
        ]);
      }

      // 3. Delete Roblox accounts, login histories, and main user account
      await Promise.all([
        AccountModel.deleteMany({ userId }).session(session),
        LoginHistoryModel.deleteMany({ userId }).session(session),
        User.findByIdAndDelete(userId).session(session),
      ]);

      await session.commitTransaction();
      transactionCommitted = true;
    } catch (txnError) {
      if (session) {
        await session.abortTransaction();
      }
      // If transactions are not supported on standalone local MongoDB instance, fallback to atomic sequential delete
      const accounts = await AccountModel.find({ userId });
      const accountIds = accounts.map((acc) => acc._id);

      if (accountIds.length > 0) {
        await Promise.all([
          InventoryModel.deleteMany({ accountId: { $in: accountIds } }),
          SessionModel.deleteMany({ accountId: { $in: accountIds } }),
          LogModel.deleteMany({ accountId: { $in: accountIds } }),
        ]);
      }

      await Promise.all([
        AccountModel.deleteMany({ userId }),
        LoginHistoryModel.deleteMany({ userId }),
        User.findByIdAndDelete(userId),
      ]);
    } finally {
      if (session) {
        session.endSession();
      }
    }

    securityLogger.info('User account permanently hard-deleted from database', { userId: userId.toString(), ip: req.ip });

    res.status(200).json({
      success: true,
      message: 'Account and all associated data permanently deleted from database'
    });
  } catch (error) {
    securityLogger.error('Failed to hard delete user account', { error: error.message, userId: req.user?.id || req.user?._id });
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

