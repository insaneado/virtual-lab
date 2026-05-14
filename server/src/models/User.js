/**
 * server/src/models/User.js
 * ────────────────────────────────────────────────────────
 * User profile schema. For the prototype phase we're
 * keeping auth lightweight — no password hashing yet.
 * The savedExperiments array gives us a quick "my labs"
 * lookup without a separate junction collection.
 * ────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type:      String,
    required:  [true, 'Username is required'],
    unique:    true,
    trim:      true,
    minlength: 3,
    maxlength: 30,
  },

  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,
    lowercase: true,
    trim:      true,
  },

  displayName: {
    type:    String,
    default: '',
  },

  avatarUrl: {
    type:    String,
    default: '',
  },

  // References to experiments this user has saved/bookmarked
  savedExperiments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Experiment',
  }],

}, {
  timestamps: true,  // Adds createdAt and updatedAt automatically
});

// Index for fast lookups on the fields we query most
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
