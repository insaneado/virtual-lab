/**
 * server/src/models/Room.js
 * ────────────────────────────────────────────────────────
 * Room metadata. Rooms are ephemeral — they exist in
 * MongoDB only so we can look them up by join code and
 * survive brief server hiccups. The actual participant
 * list is maintained in-memory by the socket layer and
 * periodically flushed here.
 * ────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
const { ROOM_CONFIG } = require('../../../shared/constants');

const participantSchema = new mongoose.Schema({
  username: { type: String, required: true },
  socketId: { type: String, required: true },
  role:     { type: String, enum: ['host', 'editor', 'viewer'], default: 'editor' },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomCode: {
    type:     String,
    required: true,
    unique:   true,
    uppercase: true,
    minlength: ROOM_CONFIG.CODE_LENGTH,
    maxlength: ROOM_CONFIG.CODE_LENGTH,
  },

  hostUser: {
    type: String,   // Username (not ObjectId — keeping it lightweight for prototype)
    required: true,
  },

  participants: {
    type: [participantSchema],
    default: [],
  },

  // If the room was initialized from a saved experiment
  experimentId: {
    type:    mongoose.Schema.Types.ObjectId,
    ref:     'Experiment',
    default: null,
  },

  isActive: {
    type:    Boolean,
    default: true,
  },

  maxUsers: {
    type:    Number,
    default: ROOM_CONFIG.MAX_USERS,
  },

  lastActivity: {
    type:    Date,
    default: Date.now,
  },

}, {
  timestamps: true,
});

roomSchema.index({ roomCode: 1 });
roomSchema.index({ isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
