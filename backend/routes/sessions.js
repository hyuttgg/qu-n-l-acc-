const express = require('express');
const Session = require('../models/Session');
const Account = require('../models/Account');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get session history of an account
// @route   GET /api/sessions/:accountId
// @access  Private
router.get('/:accountId', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const account = mockStore.findAccountById(req.params.accountId);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      const sessions = mockStore.store.sessions.filter(s => s.accountId === account.id);
      return res.status(200).json({ success: true, count: sessions.length, data: sessions });
    }

    const account = await Account.findOne({ _id: req.params.accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const sessions = await Session.find({ accountId: req.params.accountId }).sort({ startTime: -1 });

    const updatedSessions = sessions.map(session => {
      if (session.online) {
        session = session.toObject();
        session.endTime = new Date();
        session.duration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
      }
      return session;
    });

    res.status(200).json({ success: true, count: updatedSessions.length, data: updatedSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
