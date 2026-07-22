const express = require('express');
const { protect } = require('../middleware/auth');
const luaPayloadLogger = require('../utils/luaPayloadLogger');

const MASTER_ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'khanh2007nw';

// Middleware to verify passcode header for admin routes
const requireAdminPasscode = (req, res, next) => {
  const providedCode = req.headers['x-admin-passcode'] || req.query.passcode;
  if (providedCode === MASTER_ADMIN_PASSCODE) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden: Valid Master Admin Passcode required' });
};

// @desc    Verify admin passcode for restricted Inspector module
// @route   POST /api/admin/verify-passcode
// @access  Private
router.post('/verify-passcode', protect, (req, res) => {
  const { passcode } = req.body;
  if (passcode === MASTER_ADMIN_PASSCODE) {
    return res.status(200).json({
      success: true,
      message: 'Admin passcode verified successfully',
      adminToken: 'admin_unlocked_token_khanh2007nw'
    });
  }
  return res.status(401).json({
    success: false,
    message: 'Invalid Master Admin Passcode. Access Denied.'
  });
});

// @desc    Get recent raw Lua payloads for Admin Inspection
// @route   GET /api/admin/lua-logs
// @access  Private (Admin / Authenticated with Passcode)
router.get('/lua-logs', protect, requireAdminPasscode, (req, res) => {
  try {
    const logs = luaPayloadLogger.getPayloadLogs();
    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Clear Lua raw payloads log buffer
// @route   DELETE /api/admin/lua-logs
// @access  Private (Admin / Authenticated)
router.delete('/lua-logs', protect, requireAdminPasscode, (req, res) => {
  try {
    luaPayloadLogger.clearPayloadLogs();
    return res.status(200).json({
      success: true,
      message: 'Lua payload logs cleared successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Simulate receiving a test Lua payload (for Admin UI testing)
// @route   POST /api/admin/simulate-lua-payload
// @access  Private (Admin / Authenticated with Passcode)
router.post('/simulate-lua-payload', protect, requireAdminPasscode, (req, res) => {
  try {
    const samplePayload = {
      username: req.body.username || 'Roblox_Legend_Pro',
      level: 2550,
      beli: 15420900,
      fragments: 42500,
      race: 'Angel (V4)',
      sea: 3,
      fruit_equipped: 'Kitsune-Kitsune',
      fruit_mastery: 600,
      sword: 'Cursed Dual Katana',
      gun: 'Soul Guitar',
      fighting_style: 'Godhuman',
      accessory_equipped: 'Leviathan Crown, Pale Scarf',
      status: 'bossing',
      location: 'Floating Turtle',
      playtime: 14250,
      inventory: {
        fruits: [
          'Dragon-Dragon (x2)',
          'Kitsune-Kitsune (x1)',
          'Dough-Dough (x3)',
          'Spirit-Spirit (x1)',
          'Leopard-Leopard (x2)',
          'Buddha-Buddha (x4)',
          'Portal-Portal (x2)'
        ],
        swords: [
          'Cursed Dual Katana',
          'True Triple Katana',
          'Hallow Scythe',
          'Dark Blade',
          'Shark Anchor',
          'Fox Lamp'
        ],
        guns: [
          'Soul Guitar',
          'Acidum Rifle',
          'Kabucha',
          'Serpent Bow'
        ],
        styles: [
          'Godhuman',
          'Sanguine Art',
          'Electric Claw',
          'Death Step',
          'Sharkman Karate',
          'Dragon Talon',
          'Superhuman'
        ],
        materials: [
          { name: 'Dragon Scale', quantity: 35 },
          { name: 'Conjured Cocoa', quantity: 24 },
          { name: 'Mystic Droplet', quantity: 99 },
          { name: 'Leviathan Heart', quantity: 2 }
        ],
        accessories: [
          'Leviathan Crown',
          'Pale Scarf',
          'Kitsune Mask',
          'Dark Coat',
          'Valkyrie Helm'
        ]
      }
    };

    const logged = luaPayloadLogger.addPayloadLog({
      userEmail: req.user.email || 'admin@test.com',
      username: req.user.username || 'Admin',
      robloxUsername: samplePayload.username,
      ip: req.ip || '127.0.0.1',
      executorHeader: 'Synapse X / Wave (Simulated)',
      payloadSize: JSON.stringify(samplePayload).length,
      rawPayload: samplePayload,
      level: samplePayload.level,
      beli: samplePayload.beli,
      fragments: samplePayload.fragments,
      sea: samplePayload.sea,
      race: samplePayload.race,
      status: samplePayload.status,
      location: samplePayload.location,
      equipped: {
        fruit: samplePayload.fruit_equipped,
        fruitMastery: samplePayload.fruit_mastery,
        sword: samplePayload.sword,
        gun: samplePayload.gun,
        fightingStyle: samplePayload.fighting_style,
        accessory: samplePayload.accessory_equipped
      },
      inventory: samplePayload.inventory
    });

    return res.status(200).json({
      success: true,
      message: 'Simulated Lua payload generated and broadcasted',
      data: logged,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
