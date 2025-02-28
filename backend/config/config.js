// backend/config/config.js
const dotenv = require('dotenv');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
// Use .env.prod for production; otherwise use .env.<env>
const envFile = env === 'production' ? '.env.prod' : `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn(`Warning: Could not load ${envFile} at ${envPath}. Falling back to process.env.`);
}

function requireEnv(varName, defaultValue = undefined) {
  const value = process.env[varName] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${varName} is required.`);
  }
  return value;
}

module.exports = {
  NODE_ENV: env,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  // IMPORTANT: Replace the placeholder IPs with your CloudLab node addresses. (setup.py handles this automatically)
  MONGO_URI: requireEnv('MONGO_URI', 'mongodb://<cloudlab-mongo-ip>:27017/campusconnect'),
  REDIS: {
    host: requireEnv('REDIS_HOST', '<cloudlab-redis-ip>'),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  SESSION_SECRET: requireEnv('SESSION_SECRET', 'yourProductionSessionSecret'),
  SESSION_LIFETIME: parseInt(process.env.SESSION_LIFETIME, 10) || 86400000,
  COOKIE: {
    // In production, cookies are secure and use Strict SameSite
    secure: process.env.COOKIE_SECURE === 'true' || (env === 'production'),
    sameSite: process.env.COOKIE_SAME_SITE || (env === 'production' ? 'Strict' : 'Lax'),
  }
};
