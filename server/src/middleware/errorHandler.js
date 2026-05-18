const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config/env');

class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function notFound(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
}

function normalizeError(err) {
  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError('Validation failed.', 400, Object.values(err.errors).map((item) => item.message));
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError('Invalid resource identifier.', 400);
  }

  if (err.code === 11000) {
    return new AppError('A resource with those unique fields already exists.', 409, err.keyValue);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new AppError('Authentication token is invalid or expired.', 401);
  }

  if (err.statusCode) return err;

  return new AppError('Internal server error.', 500);
}

function errorHandler(err, req, res, _next) {
  const normalized = normalizeError(err);
  const statusCode = normalized.statusCode || 500;

  if (statusCode >= 500) {
    req.log?.error({ err }, normalized.message);
    if (!req.log) logger.error({ err }, normalized.message);
  } else {
    req.log?.warn({ err: normalized }, normalized.message);
  }

  res.status(statusCode).json({
    error: normalized.message,
    details: normalized.details,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
};
