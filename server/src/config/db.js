/**
 * server/src/config/db.js
 * ────────────────────────────────────────────────────────
 * MongoDB connection via Mongoose.
 *
 * We use a simple connect-and-log pattern here. Mongoose
 * handles connection pooling internally (default pool = 5).
 * In production you'd add TLS options, read preferences,
 * and maybe a replica set URI — but for dev/local, this
 * is all we need.
 * ────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
const config   = require('./env');

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      // Mongoose 8 uses the new URL parser and unified topology by default,
      // so we don't need to set those options explicitly anymore.
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[DB] Connected to MongoDB at ${config.MONGODB_URI}`);
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    // Give the operator a chance to read the error before the process exits
    process.exit(1);
  }
}

// Log disconnection events so they show up in production logs
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB connection error:', err.message);
});

module.exports = connectDB;
