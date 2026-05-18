const bcrypt = require('bcryptjs');
const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeString } = require('../utils/sanitize');
const validateRequest = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require('../middleware/auth');

const router = express.Router();

const registerValidators = [
  body('username').isString().trim().isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 }),
];

router.post(
  '/register',
  registerValidators,
  validateRequest,
  asyncHandler(async (req, res) => {
    const username = sanitizeString(req.body.username, 30);
    const email = req.body.email.toLowerCase();

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) throw new AppError('Username or email is already registered.', 409);

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ username, email, passwordHash });
    const token = signToken(user);

    setAuthCookie(res, token);
    res.status(201).json({ token, user: user.toJSON() });
  }),
);

router.post(
  '/login',
  loginValidators,
  validateRequest,
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new AppError('Invalid email or password.', 401);

    const isValid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!isValid) throw new AppError('Invalid email or password.', 401);

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ token, user: user.toJSON() });
  }),
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

module.exports = router;
