// Utility function to add timeout to database operations
const withTimeout = (operation, timeoutMs = 10000) => {
  return Promise.race([
    operation,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
    )
  ]);
};

// Enhanced error handler for database operations
const handleDBError = (error, customMessage = 'Database operation failed') => {
  console.error('Database Error:', error);
  
  if (error.message === 'Database operation timeout') {
    return {
      success: false,
      msg: 'Database connection timeout. Please try again.',
      error: 'TIMEOUT'
    };
  }
  
  if (error.name === 'MongooseError' || error.name === 'MongoError') {
    return {
      success: false,
      msg: 'Database connection issue. Please try again.',
      error: 'DB_CONNECTION'
    };
  }
  
  return {
    success: false,
    msg: customMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
  };
};

module.exports = {
  withTimeout,
  handleDBError
};
