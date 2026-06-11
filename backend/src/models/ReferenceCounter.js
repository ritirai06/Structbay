const mongoose = require('mongoose');

const referenceCounterSchema = new mongoose.Schema(
  {
    module:          { type: String, required: true },   // e.g. 'ORDER', 'VENDOR_ORDER'
    prefix:          { type: String, required: true },   // e.g. 'ORD'
    date:            { type: String, required: true },   // DDMMYY e.g. '080626'
    currentSequence: { type: Number, default: 0 },
    lastGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique per module+date combination
referenceCounterSchema.index({ module: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ReferenceCounter', referenceCounterSchema);
