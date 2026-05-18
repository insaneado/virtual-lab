const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({}, { _id: false, strict: false });

function transformDocument(_doc, ret) {
  const next = ret;
  next.id = next._id.toString();
  delete next._id;
  delete next.__v;
  return next;
}

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: [true, 'Room id is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 16,
    },
    joinCode: {
      type: String,
      required: [true, 'Join code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 12,
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Room owner is required'],
      index: true,
    },
    bodies: {
      type: [snapshotSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 1000;
        },
        message: 'Room cannot contain more than 1000 bodies',
      },
    },
    constraints: {
      type: [snapshotSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 2000;
        },
        message: 'Room cannot contain more than 2000 constraints',
      },
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: transformDocument },
    toObject: { virtuals: true, transform: transformDocument },
  },
);

roomSchema.virtual('bodyCount').get(function bodyCount() {
  return this.bodies?.length || 0;
});

roomSchema.virtual('constraintCount').get(function constraintCount() {
  return this.constraints?.length || 0;
});

roomSchema.index({ ownerId: 1, lastUpdatedAt: -1 });

module.exports = mongoose.model('Room', roomSchema);
