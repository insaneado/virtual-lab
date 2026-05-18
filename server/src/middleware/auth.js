const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('./errorHandler');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(config.AUTH_COOKIE_NAME, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(config.AUTH_COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

function getRequestToken(req) {
  const authHeader = req.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return req.cookies?.[config.AUTH_COOKIE_NAME] || null;
}

const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = getRequestToken(req);
  if (!token) throw new AppError('Authentication required.', 401);

  const payload = jwt.verify(token, config.JWT_SECRET);
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Authenticated user no longer exists.', 401);

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = getRequestToken(req);
  if (!token) return next();

  const payload = jwt.verify(token, config.JWT_SECRET);
  const user = await User.findById(payload.sub);
  if (user) req.user = user;
  return next();
});

module.exports = {
  requireAuth,
  optionalAuth,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  getRequestToken,
};
