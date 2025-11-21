const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Simple ping endpoint
router.get('/', (req, res) => {
  console.log(`Ping received at ${new Date().toISOString()}`);
  res.status(200).send('Service is active');
});

// Database health check endpoint
router.get('/db-health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (dbState === 1) {
      // Test actual database operation
      const collections = await mongoose.connection.db.listCollections().toArray();
      res.status(200).json({
        success: true,
        database: {
          state: states[dbState],
          collections: collections.length,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(503).json({
        success: false,
        database: {
          state: states[dbState],
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
