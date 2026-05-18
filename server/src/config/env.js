const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-only-change-me');

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required in production.');
}

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const config = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 4000,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtuallab',
  CLIENT_ORIGIN: clientOrigin,
  CLIENT_ORIGINS: clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || 'virtual_lab_token',
  LOG_LEVEL: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  NODE_ENV: nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
});

module.exports = config;
