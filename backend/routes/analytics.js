const express = require('express');
const Account = require('../models/Account');
const Inventory = require('../models/Inventory');
const Session = require('../models/Session');
const Log = require('../models/Log');
const mockStore = require('../utils/mockStore');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper to parse fruit items e.g. "Dragon-Dragon (x2)" -> { name: "Dragon", quantity: 2 }
const parseFruitItem = (item) => {
  if (!item) return null;

  let rawName = '';
  let quantity = 1;

  if (typeof item === 'string') {
    rawName = item;
    const matchQty = rawName.match(/\(x(\d+)\)/i) || rawName.match(/x(\d+)/i);
    if (matchQty) {
      quantity = parseInt(matchQty[1], 10) || 1;
    }
  } else if (typeof item === 'object') {
    rawName = item.name || item.Name || item.fruit || item.Fruit || '';
    quantity = item.quantity || item.Quantity || item.count || item.Count || item.value || item.Value || 1;
  }

  if (!rawName || typeof rawName !== 'string') return null;

  // Clean quantity portion e.g. "(x2)" or "x2"
  let cleanName = rawName.replace(/\(x\d+\)/gi, '').replace(/x\d+/gi, '').trim();

  // Handle Blox Fruits "Name-Name" format e.g. "Dragon-Dragon" -> "Dragon"
  if (cleanName.includes('-')) {
    const parts = cleanName.split('-');
    if (parts[0] && parts[1] && parts[0].trim().toLowerCase() === parts[1].trim().toLowerCase()) {
      cleanName = parts[0].trim();
    } else if (parts[0]) {
      cleanName = parts[0].trim();
    }
  }

  // Remove "Fruit" word at the end e.g. "Rocket Fruit" -> "Rocket"
  cleanName = cleanName.replace(/\s+Fruit$/i, '').trim();
  if (!cleanName) return null;

  // Title Case
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return { name: cleanName, quantity: Number(quantity) || 1 };
};

// @desc    Get aggregate analytics for user
// @route   GET /api/analytics/overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    // In-memory Mock fallback
    if (!global.dbConnected) {
      const accounts = mockStore.findAccountsByUserId(req.user.id || req.user._id);
      const accountIds = accounts.map((a) => a.id);

      let totalBeli = 0;
      let totalFragments = 0;
      let totalPlaytime = 0;
      let onlineCount = 0;

      accounts.forEach((acc) => {
        totalBeli += acc.beli || 0;
        totalFragments += acc.fragments || 0;
        totalPlaytime += acc.playtime || 0;
        if (acc.status !== 'offline') {
          onlineCount++;
        }
      });

      const inventories = mockStore.store.inventories.filter((inv) => accountIds.includes(inv.accountId));
      const fruitCounts = {};
      let totalFruitsCount = 0;

      inventories.forEach((inv) => {
        (inv.fruits || []).forEach((item) => {
          const parsed = parseFruitItem(item);
          if (parsed) {
            fruitCounts[parsed.name] = (fruitCounts[parsed.name] || 0) + parsed.quantity;
            totalFruitsCount += parsed.quantity;
          }
        });
      });

      const fruitsDistribution = Object.keys(fruitCounts).map((name) => ({
        name,
        value: fruitCounts[name],
      })).sort((a, b) => b.value - a.value).slice(0, 8);

      if (fruitsDistribution.length === 0 && accounts.length === 0) {
        fruitsDistribution.push(
          { name: 'Dragon', value: 4 },
          { name: 'Leopard', value: 3 },
          { name: 'Dough', value: 6 },
          { name: 'Kitsune', value: 2 },
          { name: 'Spirit', value: 5 }
        );
        totalFruitsCount = 20;
      }

      const levelProgress = accounts.map((acc) => ({
        name: acc.robloxUsername,
        level: acc.level,
        beli: acc.beli,
        fragments: acc.fragments,
      })).sort((a, b) => b.level - a.level);

      if (levelProgress.length === 0) {
        levelProgress.push(
          { name: 'roblox_acc01', level: 2550, beli: 5200000, fragments: 15000 },
          { name: 'roblox_acc02', level: 1800, beli: 3200000, fragments: 8000 },
          { name: 'roblox_acc03', level: 950, beli: 1200000, fragments: 2000 }
        );
      }

      const materialCounts = {};
      inventories.forEach((inv) => {
        (inv.materials || []).forEach((mat) => {
          if (mat && mat.name) {
            materialCounts[mat.name] = (materialCounts[mat.name] || 0) + (mat.quantity || 1);
          }
        });
      });

      const materialsDistribution = Object.keys(materialCounts).map((name) => ({
        name,
        quantity: materialCounts[name],
      })).sort((a, b) => b.quantity - a.quantity);

      if (materialsDistribution.length === 0 && accounts.length === 0) {
        materialsDistribution.push(
          { name: 'Conjured Cocoa', quantity: 15 },
          { name: 'Dragon Scale', quantity: 24 },
          { name: 'Mystic Droplet', quantity: 48 },
          { name: 'Magma Ore', quantity: 60 }
        );
      }

      const sessions = mockStore.store.sessions.filter((s) => accountIds.includes(s.accountId));
      let totalSessionsCount = sessions.length;
      let avgSessionDuration = 0;
      let longestSessionDuration = 0;

      if (sessions.length > 0) {
        let sumDuration = 0;
        sessions.forEach((s) => {
          const dur = s.duration || 0;
          sumDuration += dur;
          if (dur > longestSessionDuration) {
            longestSessionDuration = dur;
          }
        });
        avgSessionDuration = Math.round(sumDuration / sessions.length);
      } else {
        totalSessionsCount = accounts.length > 0 ? accounts.length : 12;
        avgSessionDuration = 1200;
        longestSessionDuration = 3600;
      }

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalAccounts: accounts.length,
            onlineAccounts: onlineCount,
            totalBeli,
            totalFragments,
            totalPlaytime,
            totalFruitsCount,
          },
          fruitsDistribution,
          levelProgress,
          materialsDistribution,
          sessionMetrics: {
            totalSessionsCount,
            avgSessionDuration,
            longestSessionDuration,
          },
          hourlyActivity: [
            { hour: '00:00', count: 4 },
            { hour: '04:00', count: 6 },
            { hour: '08:00', count: 12 },
            { hour: '12:00', count: 18 },
            { hour: '16:00', count: 9 },
            { hour: '20:00', count: 5 },
          ],
        },
      });
    }

    const accounts = await Account.find({ userId: req.user._id });
    const accountIds = accounts.map((a) => a._id);

    let totalBeli = 0;
    let totalFragments = 0;
    let totalPlaytime = 0;
    let onlineCount = 0;

    accounts.forEach((acc) => {
      totalBeli += acc.beli || 0;
      totalFragments += acc.fragments || 0;
      totalPlaytime += acc.playtime || 0;
      if (acc.status !== 'offline') {
        onlineCount++;
      }
    });

    // 1. Get Inventory Items details and Sessions concurrently
    const [inventories, sessions] = await Promise.all([
      Inventory.find({ accountId: { $in: accountIds } }),
      Session.find({ accountId: { $in: accountIds } }),
    ]);

    const fruitCounts = {};
    let totalFruitsCount = 0;

    inventories.forEach((inv) => {
      (inv.fruits || []).forEach((item) => {
        const parsed = parseFruitItem(item);
        if (parsed) {
          fruitCounts[parsed.name] = (fruitCounts[parsed.name] || 0) + parsed.quantity;
          totalFruitsCount += parsed.quantity;
        }
      });
    });

    const fruitsDistribution = Object.keys(fruitCounts).map((name) => ({
      name,
      value: fruitCounts[name],
    })).sort((a, b) => b.value - a.value).slice(0, 8); // Top 8 fruits

    // Fallbacks if no accounts created yet
    if (fruitsDistribution.length === 0 && accounts.length === 0) {
      fruitsDistribution.push(
        { name: 'Dragon', value: 4 },
        { name: 'Leopard', value: 3 },
        { name: 'Dough', value: 6 },
        { name: 'Kitsune', value: 2 },
        { name: 'Spirit', value: 5 }
      );
      totalFruitsCount = 20;
    }

    // 2. Level progress representation
    const levelProgress = accounts.map((acc) => ({
      name: acc.robloxUsername,
      level: acc.level,
      beli: acc.beli,
      fragments: acc.fragments,
    })).sort((a, b) => b.level - a.level);

    if (levelProgress.length === 0) {
      levelProgress.push(
        { name: 'roblox_acc01', level: 2550, beli: 5200000, fragments: 15000 },
        { name: 'roblox_acc02', level: 1800, beli: 3200000, fragments: 8000 },
        { name: 'roblox_acc03', level: 950, beli: 1200000, fragments: 2000 }
      );
    }

    // 3. Materials collected
    const materialCounts = {};
    inventories.forEach((inv) => {
      inv.materials.forEach((mat) => {
        materialCounts[mat.name] = (materialCounts[mat.name] || 0) + mat.quantity;
      });
    });

    const materialsDistribution = Object.keys(materialCounts).map((name) => ({
      name,
      quantity: materialCounts[name],
    })).sort((a, b) => b.quantity - a.quantity);

    if (materialsDistribution.length === 0) {
      materialsDistribution.push(
        { name: 'Conjured Cocoa', quantity: 15 },
        { name: 'Dragon Scale', quantity: 24 },
        { name: 'Mystic Droplet', quantity: 48 },
        { name: 'Magma Ore', quantity: 60 }
      );
    }

    // 4. Session stats (Online/Offline heatmap placeholder & summaries)
    let totalSessionsCount = sessions.length;
    let avgSessionDuration = 0;
    let longestSessionDuration = 0;

    if (sessions.length > 0) {
      let sumDuration = 0;
      sessions.forEach((s) => {
        let dur = s.duration || 0;
        if (s.online) {
          dur = Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000);
        }
        sumDuration += dur;
        if (dur > longestSessionDuration) {
          longestSessionDuration = dur;
        }
      });
      avgSessionDuration = Math.round(sumDuration / sessions.length);
    } else {
      // Fallback mocks
      totalSessionsCount = 12;
      avgSessionDuration = 1200; // 20 minutes
      longestSessionDuration = 3600; // 1 hour
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAccounts: accounts.length,
          onlineAccounts: onlineCount,
          totalBeli,
          totalFragments,
          totalPlaytime,
          totalFruitsCount,
        },
        fruitsDistribution,
        levelProgress,
        materialsDistribution,
        sessionMetrics: {
          totalSessionsCount,
          avgSessionDuration, // in seconds
          longestSessionDuration, // in seconds
        },
        // Hourly activity pattern (for heatmap)
        hourlyActivity: [
          { hour: '00:00', count: Math.floor(Math.random() * 5) + 1 },
          { hour: '04:00', count: Math.floor(Math.random() * 8) + 2 },
          { hour: '08:00', count: Math.floor(Math.random() * 12) + 5 },
          { hour: '12:00', count: Math.floor(Math.random() * 15) + 8 },
          { hour: '16:00', count: Math.floor(Math.random() * 10) + 4 },
          { hour: '20:00', count: Math.floor(Math.random() * 6) + 2 },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
