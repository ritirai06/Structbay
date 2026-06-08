const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    date:       { type: Date, required: true },   // start-of-day UTC
    snapshotType: { type: String, enum: ['daily', 'monthly'], default: 'daily' },

    orders: {
      total:      { type: Number, default: 0 },
      revenue:    { type: Number, default: 0 },
      cancelled:  { type: Number, default: 0 },
      delivered:  { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
    },
    customers: {
      total:   { type: Number, default: 0 },
      newToday:{ type: Number, default: 0 },
    },
    vendors: {
      total:  { type: Number, default: 0 },
      active: { type: Number, default: 0 },
    },
    products: {
      total:  { type: Number, default: 0 },
      active: { type: Number, default: 0 },
    },
    enquiries: {
      bulk:     { type: Number, default: 0 },
      rfq:      { type: Number, default: 0 },
      converted:{ type: Number, default: 0 },
    },
    payments: {
      collected: { type: Number, default: 0 },
      refunded:  { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

analyticsSnapshotSchema.index({ date: -1, snapshotType: 1 }, { unique: true });
module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
