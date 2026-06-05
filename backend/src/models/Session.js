const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceType: { type: String, default: null },   // mobile / desktop / tablet
    browser: { type: String, default: null },
    os: { type: String, default: null },
    loginAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, isActive: 1 });

// Parse basic device info from user-agent string
sessionSchema.statics.parseUserAgent = function (ua = '') {
  const uaLower = ua.toLowerCase();
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad/.test(uaLower)) deviceType = 'mobile';
  else if (/tablet/.test(uaLower)) deviceType = 'tablet';

  let browser = 'Unknown';
  if (/chrome/.test(uaLower) && !/edg/.test(uaLower)) browser = 'Chrome';
  else if (/firefox/.test(uaLower)) browser = 'Firefox';
  else if (/safari/.test(uaLower) && !/chrome/.test(uaLower)) browser = 'Safari';
  else if (/edg/.test(uaLower)) browser = 'Edge';
  else if (/opr|opera/.test(uaLower)) browser = 'Opera';

  let os = 'Unknown';
  if (/windows/.test(uaLower)) os = 'Windows';
  else if (/mac os/.test(uaLower)) os = 'macOS';
  else if (/linux/.test(uaLower)) os = 'Linux';
  else if (/android/.test(uaLower)) os = 'Android';
  else if (/ios|iphone|ipad/.test(uaLower)) os = 'iOS';

  return { deviceType, browser, os };
};

module.exports = mongoose.model('Session', sessionSchema);
