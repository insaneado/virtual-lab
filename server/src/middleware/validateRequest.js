const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

function validateRequest(req, _res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AppError('Request validation failed.', 400, errors.array()));
  }

  return next();
}

module.exports = validateRequest;
