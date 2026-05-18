const pino = require('pino');
const config = require('../config/env');

const loggerOptions = {
  level: config.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'token'],
    censor: '[redacted]',
  },
};

module.exports = pino(loggerOptions);
