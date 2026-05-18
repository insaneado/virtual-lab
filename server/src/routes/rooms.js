const crypto = require('crypto');
const express = require('express');
const { body, param } = require('express-validator');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeString } = require('../utils/sanitize');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();
const ROOM_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode(length) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ROOM_ID_CHARS[crypto.randomInt(ROOM_ID_CHARS.length)];
  }
  return code;
}

async function makeUniqueRoomIdentifiers() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomId = makeCode(10);
    const joinCode = makeCode(6);
    const existing = await Room.exists({ $or: [{ roomId }, { joinCode }] });
    if (!existing) return { roomId, joinCode };
  }

  throw new AppError('Could not allocate a unique room id. Try again.', 503);
}

const roomIdParam = param('id').isString().trim().isLength({ min: 6, max: 16 })
  .matches(/^[A-Z0-9]+$/i);

router.post(
  '/',
  requireAuth,
  [
    body('name').optional().isString().trim()
      .isLength({ min: 2, max: 80 }),
    body('bodies').optional().isArray({ max: 1000 }),
    body('constraints').optional().isArray({ max: 2000 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { roomId, joinCode } = await makeUniqueRoomIdentifiers();
    const room = await Room.create({
      roomId,
      joinCode,
      name: sanitizeString(req.body.name || `${req.user.username}'s Lab`, 80),
      ownerId: req.user.id,
      bodies: req.body.bodies || [],
      constraints: req.body.constraints || [],
      lastUpdatedAt: new Date(),
    });

    res.status(201).json({
      roomId: room.roomId,
      joinCode: room.joinCode,
      room,
    });
  }),
);

router.get(
  '/:id',
  roomIdParam,
  validateRequest,
  asyncHandler(async (req, res) => {
    const id = req.params.id.toUpperCase();
    const room = await Room.findOne({
      $or: [{ roomId: id }, { joinCode: id }],
      isActive: true,
    }).populate('ownerId', 'username');

    if (!room) throw new AppError('Room not found.', 404);

    res.json({
      roomId: room.roomId,
      joinCode: room.joinCode,
      name: room.name,
      owner: room.ownerId,
      bodyCount: room.bodyCount,
      constraintCount: room.constraintCount,
      lastUpdatedAt: room.lastUpdatedAt,
      isActive: room.isActive,
    });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  roomIdParam,
  validateRequest,
  asyncHandler(async (req, res) => {
    const id = req.params.id.toUpperCase();
    const room = await Room.findOne({ $or: [{ roomId: id }, { joinCode: id }], isActive: true });
    if (!room) throw new AppError('Room not found.', 404);

    if (room.ownerId.toString() !== req.user.id) {
      throw new AppError('Only the room owner can delete this room.', 403);
    }

    room.isActive = false;
    room.lastUpdatedAt = new Date();
    await room.save();

    res.status(204).send();
  }),
);

module.exports = router;
