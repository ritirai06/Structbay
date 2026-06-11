const mongoose = require('mongoose');

const mobileDeviceSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel:   { type: String, enum: ['User', 'Vendor'], default: 'User' },

    deviceToken: { type: String, required: true },
    platform:    { type: String, enum: ['android', 'ios', 'web'], required: true },
    appVersion:  String,
    deviceModel: String,
    osVersion:   String,

    isActive:    { type: Boolean, default: true },
    lastSeenAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

mobileDeviceSchema.index({ user: 1, platform: 1 });
mobileDeviceSchema.index({ deviceToken: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('MobileDevice', mobileDeviceSchema);
