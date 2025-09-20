const express = require('express');
const router = express.Router();

// Simple ping endpoint
router.get('/', (req, res) => {
  console.log(`Ping received at ${new Date().toISOString()}`);
  res.status(200).send('Service is active');
});

module.exports = router;
