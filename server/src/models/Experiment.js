/**
 * server/src/models/Experiment.js
 * ────────────────────────────────────────────────────────
 * The core data model for the Experiment Library.
 *
 * Each experiment stores a complete snapshot of the
 * Matter.js world — gravity, every body's properties,
 * and every constraint. This means any experiment can
 * be fully restored without needing the original client
 * session. Think of it like a save-file for the sandbox.
 *
 * The "forkedFrom" field enables a GitHub-style fork
 * graph so students can branch off a professor's template.
 * ────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');

// ─── Sub-schemas for world state ─────────────────────────

const vectorSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
}, { _id: false });

const renderSchema = new mongoose.Schema({
  fillStyle:   { type: String, default: '#6366f1' },
  strokeStyle: { type: String, default: '#4f46e5' },
  lineWidth:   { type: Number, default: 1.5 },
}, { _id: false });

const materialSchema = new mongoose.Schema({
  density:     { type: Number, default: 0.001 },
  friction:    { type: Number, default: 0.1 },
  restitution: { type: Number, default: 0.3 },
}, { _id: false });

const collisionFilterSchema = new mongoose.Schema({
  group:    { type: Number, default: 0 },
  category: { type: Number, default: 1 },
  mask:     { type: Number, default: 0xFFFFFFFF },
}, { _id: false });

const bodySchema = new mongoose.Schema({
  label:           { type: String, default: 'Body' },
  bodyType:        { type: String, enum: ['rectangle', 'circle', 'polygon', 'custom'], default: 'rectangle' },
  position:        { type: vectorSchema, default: () => ({ x: 0, y: 0 }) },
  angle:           { type: Number, default: 0 },
  velocity:        { type: vectorSchema, default: () => ({ x: 0, y: 0 }) },
  angularVelocity: { type: Number, default: 0 },
  isStatic:        { type: Boolean, default: false },
  dimensions:      { type: mongoose.Schema.Types.Mixed, default: {} },
  render:          { type: renderSchema, default: () => ({}) },
  material:        { type: materialSchema, default: () => ({}) },
  collisionFilter: { type: collisionFilterSchema, default: () => ({}) },
}, { _id: false });

const constraintSchema = new mongoose.Schema({
  label:      { type: String, default: 'Constraint' },
  type:       { type: String, enum: ['pin', 'spring', 'rope', 'motor'], default: 'pin' },
  bodyALabel: String,
  bodyBLabel: String,
  pointA:     { type: vectorSchema, default: null },
  pointB:     { type: vectorSchema, default: null },
  stiffness:  { type: Number, default: 1 },
  damping:    { type: Number, default: 0 },
  length:     { type: Number, default: 0 },
  motorSpeed: { type: Number, default: 0 },
}, { _id: false });

// ─── Main experiment schema ─────────────────────────────

const experimentSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: [true, 'Experiment title is required'],
    trim:     true,
    maxlength: 120,
  },

  description: {
    type:    String,
    default: '',
    maxlength: 2000,
  },

  // Base64-encoded PNG snapshot of the canvas at save time
  thumbnail: {
    type:    String,
    default: '',
  },

  author: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // ── The full physics world state ──
  worldState: {
    gravity:     { type: vectorSchema, default: () => ({ x: 0, y: 1 }) },
    bodies:      { type: [bodySchema], default: [] },
    constraints: { type: [constraintSchema], default: [] },
  },

  tags: {
    type: [String],
    default: [],
  },

  category: {
    type:    String,
    enum:    ['mechanics', 'structures', 'machines', 'custom'],
    default: 'custom',
  },

  difficulty: {
    type:    String,
    enum:    ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },

  isPublic: {
    type:    Boolean,
    default: true,
  },

  forkCount: {
    type:    Number,
    default: 0,
  },

  forkedFrom: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     'Experiment',
    default: null,
  },

}, {
  timestamps: true,
});

// Full-text search on title and description for the gallery search bar
experimentSchema.index({ title: 'text', description: 'text' });
experimentSchema.index({ author: 1, createdAt: -1 });
experimentSchema.index({ isPublic: 1, category: 1 });

module.exports = mongoose.model('Experiment', experimentSchema);
