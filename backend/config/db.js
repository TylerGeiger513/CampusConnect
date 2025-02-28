/**
 * Database connection module using Mongoose.
 * Handles MongoDB connection with error logging and reconnection logic.
 */

const mongoose = require('mongoose');
const config = require('./config');

/**
 * Connect to MongoDB using Mongoose.
 * Automatically attempts reconnection if disconnected.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI, {}); // No need for deprecated options
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // Exit process on failure
  }
};

// Handle unexpected database disconnections
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
  connectDB();
});

module.exports = connectDB;
