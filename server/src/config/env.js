/**
 * server/src/config/env.js
 * ────────────────────────────────────────────────────────
 * Loads .env and exports a frozen config object.
 * Single source of truth for every environment variable
 * the server depends on. Fail fast if anything critical
 * is missing — better to crash on boot than halfway
 * through a user session.
 * ────────────────────────────────────────────────────────
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = Object.freeze({
  PORT:          parseInt(process.env.PORT, 10) || 4000,
  MONGODB_URI:   process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtuallab',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV:      process.env.NODE_ENV || 'development',
});

module.exports = config;
