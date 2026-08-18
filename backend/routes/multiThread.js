const express = require('express');
const router = express.Router();
const os = require('os');
const multiThreadManager = require('../services/multiThreadManager');
const { protect } = require('../middleware/auth');

// Get system multi-threading capabilities & CPU specs
router.get('/system-info', (req, res) => {
  try {
    const cpus = os.cpus();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    res.json({
      success: true,
      data: {
        cpuModel: cpus[0] ? cpus[0].model : 'Generic CPU',
        cpuCores: cpus.length,
        maxRecommendedThreads: Math.min(cpus.length * 2, 32),
        totalMemoryMb: Math.round(totalMem / 1024 / 1024),
        freeMemoryMb: Math.round(freeMem / 1024 / 1024),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start multi-threaded batch job
router.post('/start', protect, async (req, res) => {
  try {
    const { taskType = 'ACCOUNT_CHECK', items = [], threadCount = 4, options = {} } = req.body;
    const userId = req.user?.id || req.user?._id || 'guest_user';
    const io = req.app.get('io');

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào (items) không được để trống và phải là dạng danh sách'
      });
    }

    const jobInfo = await multiThreadManager.startJob({
      userId: String(userId),
      taskType,
      items,
      threadCount,
      options,
      io
    });

    res.status(200).json({
      success: true,
      message: `Đã khởi chạy Job Đa Luồng thành công với ${jobInfo.threadCount} worker threads!`,
      data: jobInfo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get job status
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const status = multiThreadManager.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ success: false, message: 'Job ID không tồn tại' });
    }

    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel active job
router.post('/cancel/:jobId', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const success = multiThreadManager.cancelJob(jobId);

    if (!success) {
      return res.status(404).json({ success: false, message: 'Không thể hủy Job hoặc Job không tồn tại' });
    }

    res.json({ success: true, message: `Đã hủy Job ${jobId} thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get full job results
router.get('/results/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const results = multiThreadManager.getJobResults(jobId);

    if (!results) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy kết quả của Job này' });
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user job history
router.get('/history', protect, (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const history = multiThreadManager.getJobHistory(String(userId));
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
