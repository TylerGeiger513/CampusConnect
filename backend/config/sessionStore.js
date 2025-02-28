/**
 * Express Session Middleware Configuration
 * Uses Redis as session store with secure settings.
 */

const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redisClient = require('./redisClient');
const config = require('./config');

/**
 * Ensure `SESSION_SECRET` is defined.
 * If missing, throw an error to prevent security issues.
 */
if (!config.SESSION_SECRET) {
  console.error('❌ ERROR: SESSION_SECRET is not set. Application will not start.');
  process.exit(1);
}

/**
 * Create Redis session store with proper TTL handling.
 */
const store = new RedisStore({
  client: redisClient,
  ttl: Math.floor(config.SESSION_LIFETIME / 1000) || 86400, // Convert ms to seconds (default: 1 day)
});

/**
 * Express session middleware configuration.
 */
const sessionMiddleware = session({
  store,
  secret: config.SESSION_SECRET,
  resave: false, // Prevents unnecessary session saving
  saveUninitialized: false, // Prevents storing uninitialized sessions
  cookie: {
    maxAge: config.SESSION_LIFETIME,
    httpOnly: true, // Security: prevents client-side JS access
    secure: config.NODE_ENV === 'production', // Ensures HTTPS in production
    sameSite: config.COOKIE.sameSite || 'Lax', // Default to Lax for CSRF protection
  },
});

/**
 * Log session store status.
 */
store.on('error', (err) => {
  console.error('❌ Redis Session Store Error:', err.message);
});

console.log('✅ Session middleware initialized with Redis store');

module.exports = sessionMiddleware;
