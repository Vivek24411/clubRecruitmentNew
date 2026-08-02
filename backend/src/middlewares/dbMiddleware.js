const connectDB = require('../utils/dbConnection');

const ensureDBConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    return res.status(500).json({
      success: false,
      msg: 'Database connection failed',
    });
  }
};

module.exports = ensureDBConnection;
