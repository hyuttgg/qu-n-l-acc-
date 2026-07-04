const express = require('express');
const Inventory = require('../models/Inventory');
const Account = require('../models/Account');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get inventory of an account
// @route   GET /api/inventory/:accountId
// @access  Private
router.get('/:accountId', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const account = mockStore.findAccountById(req.params.accountId);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      const inventory = mockStore.findInventory(account.id) || { fruits: [], weapons: [], guns: [], styles: [], materials: [], accessories: [] };
      return res.status(200).json({ success: true, data: inventory });
    }

    // Make sure the account belongs to the user
    const account = await Account.findOne({ _id: req.params.accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const inventory = await Inventory.findOne({ accountId: req.params.accountId });

    res.status(200).json({
      success: true,
      data: inventory || { fruits: [], weapons: [], guns: [], styles: [], materials: [], accessories: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
