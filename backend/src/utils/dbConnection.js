const mongoose = require('mongoose');

let isConnected = false;
let listenersRegistered = false;

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;
  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('Mongoose connected to MongoDB');
  });
  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err?.message || 'unknown error');
    isConnected = false;
  });
  mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
    isConnected = false;
  });
}

async function connectDB() {
  // If already connected, return
  if (isConnected && mongoose.connection.readyState === 1) return;

  // If connecting, wait for it
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        mongoose.connection.off('connected', connected);
        mongoose.connection.off('error', failed);
        reject(new Error('Database connection timeout'));
      }, 15000);
      const connected = () => { clearTimeout(timer); mongoose.connection.off('error', failed); resolve(); };
      const failed = (error) => { clearTimeout(timer); mongoose.connection.off('connected', connected); reject(error); };
      mongoose.connection.once('connected', connected);
      mongoose.connection.once('error', failed);
    });
    isConnected = true;
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000
    };

    registerConnectionListeners();
    await mongoose.connect(process.env.MONGODB_URI, options);
    isConnected = true;
  } catch (error) {
    console.error('MongoDB connection failed:', error?.message || 'unknown error');
    isConnected = false;
    throw error;
  }
}

module.exports = connectDB;
