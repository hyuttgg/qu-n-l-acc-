const express = require('express');
const Inventory = require('../models/Inventory');
const Account = require('../models/Account');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all inventories for all accounts of the logged-in user (Batch query)
// @route   GET /api/inventory
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // In-memory Mock fallback
    if (!global.dbConnected) {
      const accounts = mockStore.findAccountsByUserId(userId);
      const invList = accounts.map((acc) => {
        const inv = mockStore.findInventory(acc.id) || { fruits: [], weapons: [], guns: [], styles: [], materials: [], accessories: [] };
        return {
          accountName: acc.robloxUsername,
          accountId: acc.id,
          inventory: inv,
        };
      });
      return res.status(200).json({ success: true, count: invList.length, data: invList });
    }

    const accounts = await Account.find({ userId }).select('_id robloxUsername');
    if (!accounts || accounts.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const accountIds = accounts.map((a) => a._id);
    const inventories = await Inventory.find({ accountId: { $in: accountIds } });
    const invMap = new Map();
    inventories.forEach((inv) => {
      invMap.set(inv.accountId.toString(), inv);
    });

    const defaultInv = { fruits: [], weapons: [], guns: [], styles: [], accessories: [], materials: [] };
    const invList = accounts.map((acc) => ({
      accountName: acc.robloxUsername,
      accountId: acc._id,
      inventory: invMap.get(acc._id.toString()) || defaultInv,
    }));

    res.status(200).json({ success: true, count: invList.length, data: invList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
