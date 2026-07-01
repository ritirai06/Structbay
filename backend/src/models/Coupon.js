const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    default: null, // null means no expiry
  },
  minCartValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    default: null, // Only relevant for PERCENTAGE
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
