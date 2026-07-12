const express = require('express');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all accounts of user
// @route   GET /api/accounts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const mockAccs = mockStore.findAccountsByUserId(req.user.id || req.user._id);
      return res.status(200).json({ success: true, count: mockAccs.length, data: mockAccs });
    }

    const accounts = await Account.find({ userId: req.user._id }).sort({ lastSeen: -1 });

    // Update statuses dynamically (if lastSeen was > 1 min ago, mark as offline)
    const timeout = 60 * 1000; // 1 minute
    const now = Date.now();
    const updatedAccounts = [];
    const accountsToOffline = [];

    for (const acc of accounts) {
      if (acc.status !== 'offline' && now - new Date(acc.lastSeen).getTime() > timeout) {
        acc.status = 'offline';
        accountsToOffline.push(acc._id);
      }
      updatedAccounts.push(acc);
    }

    // Perform database updates asynchronously (non-blocking)
    if (accountsToOffline.length > 0) {
      (async () => {
        try {
          await Account.updateMany({ _id: { $in: accountsToOffline } }, { status: 'offline' });

          const activeSessions = await Session.find({ accountId: { $in: accountsToOffline }, online: true });
          if (activeSessions.length > 0) {
            const bulkOps = activeSessions.map((session) => {
              const endTime = Date.now();
              const duration = Math.floor((endTime - session.startTime) / 1000);
              return {
                updateOne: {
                  filter: { _id: session._id },
                  update: {
                    online: false,
                    endTime,
                    duration,
                  },
                },
              };
            });
            await Session.bulkWrite(bulkOps);
          }
        } catch (dbErr) {
          console.error('[Background Status Update] Error:', dbErr);
        }
      })();
    }

    res.status(200).json({ success: true, count: updatedAccounts.length, data: updatedAccounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single account details
// @route   GET /api/accounts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const account = mockStore.findAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      const inventory = mockStore.findInventory(account.id) || { fruits: [], weapons: [], guns: [], styles: [], materials: [], accessories: [] };
      const activeSession = mockStore.findActiveSession(account.id);
      const recentLogs = mockStore.findLogs(account.id);

      return res.status(200).json({
        success: true,
        data: {
          account,
          inventory,
          activeSession,
          logs: recentLogs,
        },
      });
    }

    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Fetch dependencies concurrently
    const [inventory, activeSession, recentLogs] = await Promise.all([
      Inventory.findOne({ accountId: account._id }),
      Session.findOne({ accountId: account._id, online: true }),
      Log.find({ accountId: account._id }).sort({ timestamp: -1 }).limit(20),
    ]);

    let finalActiveSession = activeSession;
    if (activeSession && activeSession.online) {
      finalActiveSession = activeSession.toObject();
      finalActiveSession.endTime = new Date();
      finalActiveSession.duration = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
    }

    res.status(200).json({
      success: true,
      data: {
        account,
        inventory: inventory || { fruits: [], weapons: [], guns: [], styles: [], materials: [], accessories: [] },
        activeSession: finalActiveSession,
        logs: recentLogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const store = mockStore.store;
      store.accounts = store.accounts.filter(a => a.id !== req.params.id);
      store.inventories = store.inventories.filter(i => i.accountId !== req.params.id);
      store.sessions = store.sessions.filter(s => s.accountId !== req.params.id);
      store.logs = store.logs.filter(l => l.accountId !== req.params.id);
      return res.status(200).json({ success: true, message: 'Account and associated records deleted' });
    }

    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Delete all linked data
    await Account.deleteOne({ _id: account._id });
    await Inventory.deleteOne({ accountId: account._id });
    await Session.deleteMany({ accountId: account._id });
    await Log.deleteMany({ accountId: account._id });

    res.status(200).json({ success: true, message: 'Account and associated records deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update account notes
// @route   PUT /api/accounts/:id/notes
// @access  Private
router.put('/:id/notes', protect, async (req, res) => {
  try {
    const { notes } = req.body;

    // In-memory Mock fallback
    if (!global.dbConnected) {
      const account = mockStore.findAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      account.notes = notes || '';
      return res.status(200).json({ success: true, data: account });
    }

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { notes: notes || '' },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
