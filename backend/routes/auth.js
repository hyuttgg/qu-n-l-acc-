const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

// ───── Security Middleware ─────
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema, updateEmailSchema, updatePasswordSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');
const { verifyCaptcha } = require('../middleware/recaptcha');
const { incrementAttempts, resetAttempts, getAttempts } = require('../utils/loginAttemptTracker');

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
// Security: authLimiter (10 req/15 min) + Zod validation + reCAPTCHA (always)
router.post('/register', authLimiter, validate(registerSchema), verifyCaptcha, async (req, res) => {
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
// Security: authLimiter (10 req/15 min) + Zod validation + conditional reCAPTCHA (after 3 failed attempts)
router.post('/login', authLimiter, validate(loginSchema), verifyCaptcha, async (req, res) => {
  const { email, password } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserByEmail(email);
      if (!user || user.password !== password) {
        securityLogger.warn('Failed login attempt (mock)', { email, ip: req.ip });
        await incrementAttempts(req.ip, email);
        const attempts = await getAttempts(req.ip, email);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials', 
          captchaRequired: attempts >= 3 
        });
      }
      
      await resetAttempts(req.ip, email);
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
      await incrementAttempts(req.ip, email);
      const attempts = await getAttempts(req.ip, email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials', 
        captchaRequired: attempts >= 3 
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      securityLogger.warn('Failed login attempt: wrong password', { email, ip: req.ip });
      await incrementAttempts(req.ip, email);
      const attempts = await getAttempts(req.ip, email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials', 
        captchaRequired: attempts >= 3 
      });
    }

    await resetAttempts(req.ip, email);
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

// @desc    Generate a token for script loading (expires in 24 hours)
// @route   POST /api/auth/loader-token
// @access  Private
router.post('/loader-token', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
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
// @route   PUT /api/auth/update-email
// @access  Private
router.put('/update-email', protect, validate(updateEmailSchema), async (req, res) => {
  const { newEmail, password } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.password !== password) {
        securityLogger.warn('Failed email update attempt: invalid password (mock)', { userId: user.id });
        return res.status(400).json({ success: false, message: 'Incorrect password' });
      }

      const emailExists = mockStore.findUserByEmail(newEmail);
      if (emailExists && emailExists.id !== user.id) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      user.email = newEmail;
      securityLogger.info('User email updated (mock)', { userId: user.id, email: newEmail });

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          apiKey: user.apiKey,
        },
      });
    }

    // Database logic
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      securityLogger.warn('Failed email update attempt: invalid password', { userId: user._id });
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    // Check if new email is taken
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists && emailExists._id.toString() !== user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    user.email = newEmail;
    await user.save();

    securityLogger.info('User email updated', { userId: user._id, email: newEmail });

    res.status(200).json({
      success: true,
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

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
router.put('/update-password', protect, validate(updatePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const user = mockStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.password !== currentPassword) {
        securityLogger.warn('Failed password update attempt: invalid current password (mock)', { userId: user.id });
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }

      user.password = newPassword;
      securityLogger.info('User password updated (mock)', { userId: user.id });

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully',
      });
    }

    // Database logic
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      securityLogger.warn('Failed password update attempt: invalid current password', { userId: user._id });
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
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

module.exports = router;
