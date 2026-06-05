const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL auto-delete
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Static: generate a secure random token
verificationTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

// Static: create email verification token (expires in 24h)
verificationTokenSchema.statics.createEmailToken = async function (userId) {
  await this.deleteMany({ user: userId, type: 'EMAIL_VERIFICATION' });
  const token = this.generateToken();
  return this.create({
    user: userId,
    token,
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
};

// Static: create password reset token (expires in 1h)
verificationTokenSchema.statics.createResetToken = async function (userId) {
  await this.deleteMany({ user: userId, type: 'PASSWORD_RESET' });
  const token = this.generateToken();
  return this.create({
    user: userId,
    token,
    type: 'PASSWORD_RESET',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
