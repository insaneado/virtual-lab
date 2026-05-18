const mongoose = require('mongoose');

function transformDocument(_doc, ret) {
  const next = ret;
  next.id = next._id.toString();
  delete next._id;
  delete next.__v;
  delete next.passwordHash;
  return next;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email must be valid'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    savedExperiments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: { virtuals: true, transform: transformDocument },
    toObject: { virtuals: true, transform: transformDocument },
  },
);

userSchema.virtual('savedExperimentCount').get(function savedExperimentCount() {
  return this.savedExperiments?.length || 0;
});

module.exports = mongoose.model('User', userSchema);
