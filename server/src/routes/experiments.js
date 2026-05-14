/**
 * server/src/routes/experiments.js
 * ────────────────────────────────────────────────────────
 * CRUD API for the Experiment Library.
 *
 * Endpoints:
 *   GET    /api/experiments          → list public experiments (paginated, filterable)
 *   GET    /api/experiments/:id      → single experiment detail
 *   POST   /api/experiments          → save a new experiment
 *   PUT    /api/experiments/:id      → update an existing experiment
 *   DELETE /api/experiments/:id      → remove an experiment
 *   POST   /api/experiments/:id/fork → fork someone else's experiment
 * ────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const Experiment = require('../models/Experiment');

// ─── LIST EXPERIMENTS ─────────────────────────────────
// Supports: ?page=1&limit=12&category=mechanics&difficulty=beginner&search=bridge
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      difficulty,
      search,
    } = req.query;

    const filter = { isPublic: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [experiments, total] = await Promise.all([
      Experiment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .select('-worldState')     // Don't send the full world state in the list view
        .populate('author', 'username displayName avatarUrl')
        .lean(),
      Experiment.countDocuments(filter),
    ]);

    res.json({
      experiments,
      pagination: {
        page:  parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('[API] GET /experiments error:', err.message);
    res.status(500).json({ error: 'Failed to fetch experiments.' });
  }
});

// ─── GET SINGLE EXPERIMENT ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.params.id)
      .populate('author', 'username displayName avatarUrl')
      .lean();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    res.json(experiment);
  } catch (err) {
    console.error('[API] GET /experiments/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch experiment.' });
  }
});

// ─── CREATE EXPERIMENT ────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      thumbnail,
      authorId,
      worldState,
      tags,
      category,
      difficulty,
      isPublic,
    } = req.body;

    if (!title || !authorId || !worldState) {
      return res.status(400).json({
        error: 'Missing required fields: title, authorId, worldState',
      });
    }

    const experiment = await Experiment.create({
      title,
      description: description || '',
      thumbnail: thumbnail || '',
      author: authorId,
      worldState,
      tags: tags || [],
      category: category || 'custom',
      difficulty: difficulty || 'beginner',
      isPublic: isPublic !== false,
    });

    res.status(201).json(experiment);
  } catch (err) {
    console.error('[API] POST /experiments error:', err.message);
    res.status(500).json({ error: 'Failed to save experiment.' });
  }
});

// ─── UPDATE EXPERIMENT ────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    // Prevent overwriting the author
    delete updates.author;
    delete updates.authorId;

    const experiment = await Experiment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    res.json(experiment);
  } catch (err) {
    console.error('[API] PUT /experiments/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update experiment.' });
  }
});

// ─── DELETE EXPERIMENT ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const experiment = await Experiment.findByIdAndDelete(req.params.id);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found.' });
    }

    res.json({ message: 'Experiment deleted.', id: req.params.id });
  } catch (err) {
    console.error('[API] DELETE /experiments/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete experiment.' });
  }
});

// ─── FORK EXPERIMENT ──────────────────────────────────
router.post('/:id/fork', async (req, res) => {
  try {
    const { authorId } = req.body;

    if (!authorId) {
      return res.status(400).json({ error: 'authorId is required to fork.' });
    }

    const original = await Experiment.findById(req.params.id).lean();

    if (!original) {
      return res.status(404).json({ error: 'Original experiment not found.' });
    }

    // Increment the fork count on the original
    await Experiment.findByIdAndUpdate(req.params.id, { $inc: { forkCount: 1 } });

    // Create the forked copy
    const forked = await Experiment.create({
      title:       `${original.title} (Fork)`,
      description: original.description,
      author:      authorId,
      worldState:  original.worldState,
      tags:        original.tags,
      category:    original.category,
      difficulty:  original.difficulty,
      isPublic:    true,
      forkedFrom:  original._id,
    });

    res.status(201).json(forked);
  } catch (err) {
    console.error('[API] POST /experiments/:id/fork error:', err.message);
    res.status(500).json({ error: 'Failed to fork experiment.' });
  }
});

module.exports = router;
