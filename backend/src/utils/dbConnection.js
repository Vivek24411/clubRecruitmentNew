const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  // If already connected, return
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  // If connecting, wait for it
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    console.log('MongoDB already connected');
    return;
  }

  if (mongoose.connection.readyState === 2) {
    console.log('MongoDB connection in progress, waiting...');
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
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

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    isConnected = true;
    console.log('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    isConnected = false;
    throw error;
  }
}

module.exports = connectDB;
