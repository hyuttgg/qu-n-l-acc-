const express = require('express');
const LeviathanSession = require('../models/LeviathanSession');
const Account = require('../models/Account');

// Middleware
const { protect, requireApiKey } = require('../middleware/auth');
const { validate, leviathanUpdateSchema } = require('../middleware/validator');
const { securityLogger } = require('../middleware/logging');

const router = express.Router();

// ══════════════════════════════════════
// @desc    Receive update from Lua script in Roblox
// @route   POST /api/leviathan/update
// @access  Private (API Key required)
// ══════════════════════════════════════
router.post(
  '/update',
  requireApiKey,
  validate(leviathanUpdateSchema),
  async (req, res) => {
    const payload = req.body;
    const user = req.apiUser;

    const robloxUsername = payload.roblox_username || payload.username;
    if (!robloxUsername) {
      return res.status(400).json({ success: false, message: 'robloxUsername is required' });
    }

    try {
      // 1. Resolve Roblox account
      let account = await Account.findOne({ userId: user._id, robloxUsername });
      if (!account) {
        // Create dynamic account if missing (fallback for onboarding ease)
        account = await Account.create({
          userId: user._id,
          robloxUsername,
          status: 'sea_event',
          location: 'Third Sea'
        });
      }

      // 2. Find currently active Leviathan session for this account
      let session = await LeviathanSession.findOne({ accountId: account._id, isActive: true });

      // If no active session, check if we should create a new one
      if (!session) {
        if (payload.status === 'Finished' || payload.status === 'Not Started') {
          return res.status(200).json({
            success: true,
            message: 'No active session. Status not started/finished.',
          });
        }
        
        session = new LeviathanSession({
          userId: user._id,
          accountId: account._id,
          robloxUsername,
          serverId: payload.serverId || 'Unknown',
          status: payload.status || 'Searching',
          startedAt: Date.now(),
          isActive: true
        });
      }

      // 3. Update session properties
      if (payload.serverId) session.serverId = payload.serverId;
      if (payload.status) session.status = payload.status;

      // Update progress subdocument
      if (!session.progress) session.progress = {};
      
      if (payload.spyMessage !== undefined) {
        session.progress.spyMessage = payload.spyMessage;
        // Classify the spy message text
        let spyStatus = 'Unknown';
        if (payload.spyMessage.includes("The Leviathan is out there! Go find it before anyone else does!")) {
          spyStatus = 'Leviathan Available';
        } else if (payload.spyMessage !== '' && payload.spyMessage !== "I don't know anything yet.") {
          spyStatus = 'Other';
        } else if (payload.spyMessage === "I don't know anything yet.") {
          spyStatus = 'Unknown';
        }
        session.progress.spyStatus = spyStatus;
      }
      if (payload.dangerLevel !== undefined) session.progress.dangerLevel = payload.dangerLevel;
      
      if (payload.frozenDetected !== undefined) {
        session.progress.frozenDetected = payload.frozenDetected;
        if (payload.frozenDetected) {
          session.progress.frozenTime = payload.frozenTime ? new Date(payload.frozenTime) : Date.now();
          if (payload.frozenSea !== undefined) session.progress.frozenSea = payload.frozenSea;
          if (payload.frozenCoordinates !== undefined) session.progress.frozenCoordinates = payload.frozenCoordinates;
        }
      }

      if (payload.heartStatus) session.progress.heartStatus = payload.heartStatus;
      if (payload.destination !== undefined) session.progress.destination = payload.destination;
      if (payload.remainingDistance !== undefined) session.progress.remainingDistance = payload.remainingDistance;
      session.progress.currentStage = payload.status || session.status;

      // Update team list
      if (payload.party && Array.isArray(payload.party)) {
        session.team = payload.party.map((p) => ({
          username: p.username,
          alive: p.alive !== undefined ? p.alive : true,
          dead: p.dead !== undefined ? p.dead : false,
        }));
      }

      // Update rewards
      if (payload.rewards) {
        if (!session.rewards) session.rewards = {};
        if (payload.rewards.scale !== undefined) session.rewards.scale = payload.rewards.scale;
        if (payload.rewards.fins !== undefined) session.rewards.fins = payload.rewards.fins;
        if (payload.rewards.heart !== undefined) session.rewards.heart = payload.rewards.heart;
        if (payload.rewards.fragments !== undefined) session.rewards.fragments = payload.rewards.fragments;
        if (payload.rewards.exp !== undefined) session.rewards.exp = payload.rewards.exp;
        if (payload.rewards.otherDrop) session.rewards.otherDrop = payload.rewards.otherDrop;
      }

      // Update battleStats
      if (payload.battleStats) {
        if (!session.battleStats) session.battleStats = {};
        if (payload.battleStats.damagePhase !== undefined) session.battleStats.damagePhase = payload.battleStats.damagePhase;
        if (payload.battleStats.membersAlive !== undefined) session.battleStats.membersAlive = payload.battleStats.membersAlive;
        if (payload.battleStats.membersDead !== undefined) session.battleStats.membersDead = payload.battleStats.membersDead;
        if (payload.battleStats.disconnectCount !== undefined) session.battleStats.disconnectCount = payload.battleStats.disconnectCount;
      }

      // Close session if finished
      if (payload.status === 'Finished') {
        session.isActive = false;
        session.endedAt = Date.now();
        session.duration = Math.floor((session.endedAt - session.startedAt) / 1000);
      }

      await session.save();

      // Update Account status to match
      if (payload.status && payload.status !== 'Finished') {
        account.status = 'sea_event';
        account.location = 'Third Sea (Danger Level ' + (payload.dangerLevel || 1) + ')';
        await account.save();
      } else if (payload.status === 'Finished') {
        account.status = 'idle';
        await account.save();
      }

      // 4. WebSocket Realtime Emit
      const io = req.app.get('io');
      if (io) {
        const room = user._id.toString();
        io.to(room).emit('leviathan_update', {
          session,
          account
        });
      }

      securityLogger.info('Leviathan update processed', { username: robloxUsername, userId: user._id });

      res.status(200).json({
        success: true,
        message: 'Leviathan session updated successfully',
        sessionId: session._id,
      });
    } catch (error) {
      console.error('Leviathan Ingestion Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ══════════════════════════════════════
// @desc    Get active Leviathan hunting session
// @route   GET /api/leviathan/active
// @access  Private (User JWT required)
// ══════════════════════════════════════
router.get('/active', protect, async (req, res) => {
  try {
    const session = await LeviathanSession.findOne({ userId: req.user._id, isActive: true })
      .populate('accountId');

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════
// @desc    Get recent historical Leviathan hunting sessions
// @route   GET /api/leviathan/history
// @access  Private (User JWT required)
// ══════════════════════════════════════
router.get('/history', protect, async (req, res) => {
  try {
    const history = await LeviathanSession.find({ userId: req.user._id, isActive: false })
      .populate('accountId')
      .sort({ endedAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════
// @desc    Get aggregated Leviathan hunt analytics
// @route   GET /api/leviathan/analytics
// @access  Private (User JWT required)
// ══════════════════════════════════════
router.get('/analytics', protect, async (req, res) => {
  try {
    const sessions = await LeviathanSession.find({ userId: req.user._id });
    
    const totalHunts = sessions.length;
    const finishedHunts = sessions.filter(s => !s.isActive).length;
    
    let totalHearts = 0;
    let totalScales = 0;
    let successfulHeartsHunts = 0;
    let totalDuration = 0;
    let avgDuration = 0;

    sessions.forEach(s => {
      if (s.rewards) {
        totalHearts += s.rewards.heart || 0;
        totalScales += s.rewards.scale || 0;
        if (s.rewards.heart > 0) {
          successfulHeartsHunts++;
        }
      }
      if (!s.isActive && s.duration) {
        totalDuration += s.duration;
      }
    });

    if (finishedHunts > 0) {
      avgDuration = Math.round(totalDuration / finishedHunts);
    }

    const successRate = totalHunts > 0 ? Math.round((successfulHeartsHunts / totalHunts) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalHunts,
        successRate,
        avgDuration,
        totalScales,
        totalHearts,
        avgDeaths: totalHunts > 0 ? (sessions.reduce((acc, s) => acc + (s.battleStats?.membersDead || 0), 0) / totalHunts).toFixed(1) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
