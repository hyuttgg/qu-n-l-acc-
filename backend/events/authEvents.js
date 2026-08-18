const EventEmitter = require('events');
const { sendLoginNotification } = require('../utils/email');
const LoginHistory = require('../models/LoginHistory');
const mockStore = require('../utils/mockStore');
const { securityLogger } = require('../middleware/logging');
const { getDeviceDetails } = require('../utils/deviceParser');

const authEmitter = new EventEmitter();

authEmitter.on('login.success', async ({ user, req }) => {
  const userAgent = req.headers['user-agent'] || '';
  const { os, browser } = getDeviceDetails(userAgent);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
  const userId = user._id || user.id;

  try {
    // 1. Log to LoginHistory collection / mockStore fallback
    if (global.dbConnected) {
      await LoginHistory.create({
        userId,
        ip,
        os,
        browser,
        success: true,
      });
    } else {
      mockStore.saveLoginHistory({
        userId,
        ip,
        os,
        browser,
        success: true,
      });
    }
    securityLogger.info('Login history recorded successfully', { userId, ip });
  } catch (err) {
    securityLogger.error('Failed to log login history', { error: err.message, userId });
  }

  // 2. Check if this device/IP is a known combination for this user in the last 30 days
  let isNewDevice = true;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    if (global.dbConnected) {
      const existingLogin = await LoginHistory.findOne({
        userId,
        ip,
        os,
        browser,
        success: true,
        loginTime: { $gte: thirtyDaysAgo }
      });
      if (existingLogin) {
        isNewDevice = false;
      }
    } else {
      const existingLogin = mockStore.store.loginHistories.find(h => 
        h.userId.toString() === userId.toString() &&
        h.ip === ip &&
        h.os === os &&
        h.browser === browser &&
        h.success === true &&
        new Date(h.loginTime) >= thirtyDaysAgo
      );
      if (existingLogin) {
        isNewDevice = false;
      }
    }
  } catch (err) {
    securityLogger.error('Failed to query login history for device verification', { error: err.message, userId });
  }

  // 3. Send email notification asynchronously ONLY if it is a new/unrecognized device
  if (user.email) {
    if (isNewDevice) {
      sendLoginNotification(user.email, user.username, req).catch((err) => {
        securityLogger.error('Failed to send login email notification asynchronously via event emitter', {
          error: err.message,
          email: user.email,
        });
      });
    } else {
      securityLogger.info('Email notification skipped: Recognized device/IP logged in', { userId, ip, os, browser });
    }
  }
});

module.exports = authEmitter;
