/**
 * Redis Client Configuration
 * Uses Redis v4+ with proper error handling, shutdown cleanup, and environment-based settings.
 */

const redis = require('redis');
const config = require('./config');

const client = redis.createClient({
  socket: {
    host: config.REDIS.host, // Use config instead of process.env
    port: parseInt(config.REDIS.port, 10) || 6379, // Ensure port is a number
  },
  password: config.REDIS.password || undefined, // Explicitly set undefined if no password
});

/**
 * Handle Redis Client Errors
 */
client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

/**
 * Connect to Redis with Error Handling
 */
const connectRedis = async () => {
  try {
    await client.connect();
    console.log('✅ Redis Connected Successfully');
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
    process.exit(1); // Exit process on failure
  }
};

// Establish connection
connectRedis();

/**
 * Graceful Shutdown Handler
 */
const shutdown = async () => {
  console.log('⚠️ Shutting down Redis client...');
  await client.quit();
  console.log('✅ Redis client shut down.');
  process.exit(0);
};

// Handle process termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = client;
