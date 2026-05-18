const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({}, { _id: false, strict: false });

function transformDocument(_doc, ret) {
  const next = ret;
  next.id = next._id.toString();
  delete next._id;
  delete next.__v;
  return next;
}

const experimentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Experiment title is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    thumbnail: {
      type: String,
      default: '',
      maxlength: 2_000_000,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 12 && value.every((tag) => tag.length <= 32);
        },
        message: 'Experiments may have up to 12 short tags',
      },
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    bodySnapshot: {
      type: [snapshotSchema],
      required: true,
      default: [],
      validate: {
        validator(value) {
          return value.length <= 1000;
        },
        message: 'Experiment cannot contain more than 1000 bodies',
      },
    },
    constraintSnapshot: {
      type: [snapshotSchema],
      required: true,
      default: [],
      validate: {
        validator(value) {
          return value.length <= 2000;
        },
        message: 'Experiment cannot contain more than 2000 constraints',
      },
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: { virtuals: true, transform: transformDocument },
    toObject: { virtuals: true, transform: transformDocument },
  },
);

experimentSchema.virtual('bodyCount').get(function bodyCount() {
  return this.bodySnapshot?.length || 0;
});

experimentSchema.virtual('constraintCount').get(function constraintCount() {
  return this.constraintSnapshot?.length || 0;
});

experimentSchema.virtual('worldState').get(function worldState() {
  return {
    bodies: this.bodySnapshot || [],
    constraints: this.constraintSnapshot || [],
  };
});

experimentSchema.index({ title: 'text', tags: 'text' });
experimentSchema.index({ authorId: 1, createdAt: -1 });
experimentSchema.index({ isPublic: 1, createdAt: -1 });
experimentSchema.index({ tags: 1 });

module.exports = mongoose.model('Experiment', experimentSchema);
