const express = require('express');
const { body, param, query } = require('express-validator');
const Experiment = require('../models/Experiment');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeString, sanitizeStringArray } = require('../utils/sanitize');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

function parsePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function visibilityFilter(user) {
  if (!user) return { isPublic: true };
  return { $or: [{ isPublic: true }, { authorId: user.id }] };
}

async function loadExperimentForOwner(id, userId) {
  const experiment = await Experiment.findById(id);
  if (!experiment) throw new AppError('Experiment not found.', 404);
  if (experiment.authorId.toString() !== userId) {
    throw new AppError('Only the experiment owner can modify this experiment.', 403);
  }
  return experiment;
}

const idParam = param('id').isMongoId();

router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim()
      .isLength({ max: 120 }),
    query('tags').optional().isString().trim()
      .isLength({ max: 300 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 1, 10_000);
    const limit = parsePositiveInteger(req.query.limit, 12, 100);
    const filter = visibilityFilter(req.user);
    const search = sanitizeString(req.query.search || '', 120);
    const tags = sanitizeStringArray(String(req.query.tags || '').split(','));

    if (search) filter.$text = { $search: search };
    if (tags.length) filter.tags = { $all: tags };

    const sort = search ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 };
    const projection = search
      ? { score: { $meta: 'textScore' }, bodySnapshot: 0, constraintSnapshot: 0 }
      : { bodySnapshot: 0, constraintSnapshot: 0 };

    const [experiments, total] = await Promise.all([
      Experiment.find(filter, projection)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', 'username')
        .lean({ virtuals: true }),
      Experiment.countDocuments(filter),
    ]);

    res.json({
      experiments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

router.post(
  '/',
  requireAuth,
  [
    body('title').isString().trim().isLength({ min: 2, max: 120 }),
    body('description').optional().isString().trim()
      .isLength({ max: 2000 }),
    body('thumbnail').optional().isString().isLength({ max: 2_000_000 }),
    body('tags').optional().isArray({ max: 12 }),
    body('bodySnapshot').isArray({ max: 1000 }),
    body('constraintSnapshot').isArray({ max: 2000 }),
    body('isPublic').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const experiment = await Experiment.create({
      title: sanitizeString(req.body.title, 120),
      description: sanitizeString(req.body.description || '', 2000),
      thumbnail: req.body.thumbnail || '',
      tags: sanitizeStringArray(req.body.tags || []),
      authorId: req.user.id,
      bodySnapshot: req.body.bodySnapshot,
      constraintSnapshot: req.body.constraintSnapshot,
      isPublic: req.body.isPublic !== false,
    });

    res.status(201).json(experiment);
  }),
);

router.get(
  '/:id',
  optionalAuth,
  idParam,
  validateRequest,
  asyncHandler(async (req, res) => {
    const experiment = await Experiment.findById(req.params.id).populate('authorId', 'username');
    if (!experiment) throw new AppError('Experiment not found.', 404);

    if (!experiment.isPublic && (!req.user || experiment.authorId.id !== req.user.id)) {
      throw new AppError('You do not have access to this experiment.', 403);
    }

    res.json(experiment);
  }),
);

router.put(
  '/:id',
  requireAuth,
  idParam,
  [
    body('title').optional().isString().trim()
      .isLength({ min: 2, max: 120 }),
    body('description').optional().isString().trim()
      .isLength({ max: 2000 }),
    body('thumbnail').optional().isString().isLength({ max: 2_000_000 }),
    body('tags').optional().isArray({ max: 12 }),
    body('bodySnapshot').optional().isArray({ max: 1000 }),
    body('constraintSnapshot').optional().isArray({ max: 2000 }),
    body('isPublic').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const experiment = await loadExperimentForOwner(req.params.id, req.user.id);
    const updates = {};

    if (req.body.title !== undefined) updates.title = sanitizeString(req.body.title, 120);
    if (req.body.description !== undefined) updates.description = sanitizeString(req.body.description, 2000);
    if (req.body.thumbnail !== undefined) updates.thumbnail = req.body.thumbnail;
    if (req.body.tags !== undefined) updates.tags = sanitizeStringArray(req.body.tags);
    if (req.body.bodySnapshot !== undefined) updates.bodySnapshot = req.body.bodySnapshot;
    if (req.body.constraintSnapshot !== undefined) updates.constraintSnapshot = req.body.constraintSnapshot;
    if (req.body.isPublic !== undefined) updates.isPublic = req.body.isPublic;

    Object.assign(experiment, updates);
    await experiment.save();

    res.json(experiment);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  idParam,
  validateRequest,
  asyncHandler(async (req, res) => {
    const experiment = await loadExperimentForOwner(req.params.id, req.user.id);
    await experiment.deleteOne();
    res.status(204).send();
  }),
);

module.exports = router;
