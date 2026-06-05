const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL — auto-delete expired tokens
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    // Session metadata
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceInfo: { type: String, default: null },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, isRevoked: 1 });

// Static: revoke all tokens for a user (logout all devices)
refreshTokenSchema.statics.revokeAllForUser = function (userId) {
  return this.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};

// Static: revoke a single token
refreshTokenSchema.statics.revokeToken = function (token) {
  return this.updateOne({ token }, { isRevoked: true });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
