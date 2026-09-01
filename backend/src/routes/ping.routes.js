const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const jobModel = require('../models/job.model');
const { metricsSnapshot } = require('../utils/observability');

// Simple ping endpoint
router.get('/', (req, res) => {
  res.status(200).send('Service is active');
});

// Database health check endpoint
router.get('/db-health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/metrics', async (req, res) => {
  const application = metricsSnapshot();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, application, queue: { status: 'unavailable' } });
  }
  const [queued, processing, failed, oldest] = await Promise.all([
    jobModel.countDocuments({ status: 'queued' }),
    jobModel.countDocuments({ status: 'processing' }),
    jobModel.countDocuments({ status: 'failed' }),
    jobModel.findOne({ status: 'queued' }).sort({ runAt: 1 }).select('runAt').lean(),
  ]);
  return res.json({
    success: true,
    application,
    queue: {
      queued,
      processing,
      failed,
      oldestRunAt: oldest?.runAt || null,
      delaySeconds: oldest?.runAt ? Math.max(0, Math.round((Date.now() - new Date(oldest.runAt).getTime()) / 1000)) : 0,
    },
  });
});

module.exports = router;
