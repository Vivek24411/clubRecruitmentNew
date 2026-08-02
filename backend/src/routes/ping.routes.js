const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

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

module.exports = router;
