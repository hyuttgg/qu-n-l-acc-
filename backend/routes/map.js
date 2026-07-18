const express = require('express');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');
const { lookupIp } = require('../utils/geoLookup');

const router = express.Router();

// Active user sessions tracking map (Socket ID -> Session object)
global.activeUserSessions = global.activeUserSessions || new Map();

/**
 * @desc    Get all users with their online/offline state and geolocated coordinates
 * @route   GET /api/map/users
 * @access  Private
 */
router.get('/users', protect, async (req, res) => {
  try {
    // 1. Gather all online users from the active socket sessions
    const onlineMap = new Map(); // userId -> activeSession object
    for (const session of global.activeUserSessions.values()) {
      onlineMap.set(session.userId.toString(), {
        username: session.username,
        province: session.province,
        lat: session.lat,
        lng: session.lng,
        online: true,
        os: session.os,
        browser: session.browser,
        loginMethod: session.loginMethod,
        ip: session.ip,
        ping: session.ping || 0,
        loginTime: session.startTime,
        district: session.district || '',
        city: session.city || '',
      });
    }

    const allUsersData = [];

    // 2. Fetch all registered users
    let allUsers = [];
    if (global.dbConnected) {
      allUsers = await User.find({}, 'username email discordId googleId createdAt');
    } else {
      allUsers = mockStore.store.users;
    }

    // 3. For each user, if they are online, add their live data. If offline, find their latest login history.
    for (const user of allUsers) {
      const userIdStr = (user._id || user.id).toString();

      if (onlineMap.has(userIdStr)) {
        // User is online
        allUsersData.push({
          id: userIdStr,
          ...onlineMap.get(userIdStr),
        });
      } else {
        // User is offline - find their latest successful login
        let lastLogin = null;
        if (global.dbConnected) {
          lastLogin = await LoginHistory.findOne({ userId: user._id, success: true })
            .sort({ loginTime: -1 });
        } else {
          lastLogin = [...mockStore.store.loginHistories]
            .filter(h => h.userId.toString() === userIdStr && h.success)
            .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))[0];
        }

        const loginMethod = user.discordId ? 'Discord' : (user.googleId ? 'Google' : 'Email');

        if (lastLogin) {
          // Geolocate their last login IP
          const geo = await lookupIp(lastLogin.ip);
          allUsersData.push({
            id: userIdStr,
            username: user.username,
            province: geo.region || geo.city || 'Unknown',
            lat: geo.latitude,
            lng: geo.longitude,
            online: false,
            os: lastLogin.os || 'Unknown OS',
            browser: lastLogin.browser || 'Unknown Browser',
            loginMethod: loginMethod,
            ip: lastLogin.ip || 'Unknown',
            ping: 0,
            loginTime: lastLogin.loginTime,
            district: geo.city || '',
            city: geo.city || '',
          });
        } else {
          // No login history yet - put a default offline placeholder at Ho Chi Minh
          allUsersData.push({
            id: userIdStr,
            username: user.username,
            province: 'Ho Chi Minh',
            lat: 10.823,
            lng: 106.629,
            online: false,
            os: 'Unknown OS',
            browser: 'Unknown Browser',
            loginMethod: loginMethod,
            ip: 'Unknown',
            ping: 0,
            loginTime: user.createdAt,
            district: '',
            city: '',
          });
        }
      }
    }

    res.status(200).json(allUsersData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get active online users count grouped by province
 * @route   GET /api/map/online
 * @access  Private
 */
router.get('/online', protect, async (req, res) => {
  try {
    const provinceCounts = {};

    for (const session of global.activeUserSessions.values()) {
      const province = session.province || 'Unknown';
      provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    }

    const result = Object.keys(provinceCounts).map((province) => ({
      province,
      online: provinceCounts[province],
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc    Get all users in a specific province (both online and offline)
 * @route   GET /api/map/province/:province
 * @access  Private
 */
router.get('/province/:province', protect, async (req, res) => {
  try {
    const targetProvince = req.params.province;
    if (!targetProvince) {
      return res.status(400).json({ success: false, message: 'Province parameter is required' });
    }

    // 1. Gather all online users from the active socket sessions
    const onlineMap = new Map();
    for (const session of global.activeUserSessions.values()) {
      onlineMap.set(session.userId.toString(), {
        username: session.username,
        province: session.province,
        lat: session.lat,
        lng: session.lng,
        online: true,
        os: session.os,
        browser: session.browser,
        loginMethod: session.loginMethod,
        ip: session.ip,
        ping: session.ping || 0,
        loginTime: session.startTime,
        district: session.district || '',
        city: session.city || '',
      });
    }

    const matchingUsers = [];

    // 2. Fetch all registered users
    let allUsers = [];
    if (global.dbConnected) {
      allUsers = await User.find({}, 'username email discordId googleId createdAt');
    } else {
      allUsers = mockStore.store.users;
    }

    // 3. Filter by province
    for (const user of allUsers) {
      const userIdStr = (user._id || user.id).toString();

      if (onlineMap.has(userIdStr)) {
        const onlineData = onlineMap.get(userIdStr);
        if (onlineData.province.toLowerCase() === targetProvince.toLowerCase()) {
          matchingUsers.push({
            id: userIdStr,
            ...onlineData,
          });
        }
      } else {
        // Find latest successful login
        let lastLogin = null;
        if (global.dbConnected) {
          lastLogin = await LoginHistory.findOne({ userId: user._id, success: true })
            .sort({ loginTime: -1 });
        } else {
          lastLogin = [...mockStore.store.loginHistories]
            .filter(h => h.userId.toString() === userIdStr && h.success)
            .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))[0];
        }

        const loginMethod = user.discordId ? 'Discord' : (user.googleId ? 'Google' : 'Email');

        if (lastLogin) {
          const geo = await lookupIp(lastLogin.ip);
          const userProvince = geo.region || geo.city || 'Unknown';
          
          if (userProvince.toLowerCase() === targetProvince.toLowerCase()) {
            matchingUsers.push({
              id: userIdStr,
              username: user.username,
              province: userProvince,
              lat: geo.latitude,
              lng: geo.longitude,
              online: false,
              os: lastLogin.os || 'Unknown OS',
              browser: lastLogin.browser || 'Unknown Browser',
              loginMethod: loginMethod,
              ip: lastLogin.ip || 'Unknown',
              ping: 0,
              loginTime: lastLogin.loginTime,
              district: geo.city || '',
              city: geo.city || '',
            });
          }
        } else if (targetProvince.toLowerCase() === 'ho chi minh') {
          // Fallback placeholder is Ho Chi Minh, so match if query is 'ho chi minh'
          matchingUsers.push({
            id: userIdStr,
            username: user.username,
            province: 'Ho Chi Minh',
            lat: 10.823,
            lng: 106.629,
            online: false,
            os: 'Unknown OS',
            browser: 'Unknown Browser',
            loginMethod: loginMethod,
            ip: 'Unknown',
            ping: 0,
            loginTime: user.createdAt,
            district: '',
            city: '',
          });
        }
      }
    }

    res.status(200).json(matchingUsers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
