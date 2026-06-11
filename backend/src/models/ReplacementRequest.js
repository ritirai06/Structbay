const mongoose = require('mongoose');

const replacementRequestSchema = new mongoose.Schema(
  {
    masterOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    reason: {
      type: String,
      enum: ['WRONG_PRODUCT', 'DAMAGED_PRODUCT'],
      required: true,
    },
    description:  String,
    images:       [String],

    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'VENDOR_ASSIGNED', 'DISPATCHED', 'COMPLETED'],
      default: 'PENDING',
    },

    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:  Date,
    reviewNotes: String,

    replacementVendorOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' },
    replacementItems: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        reason:   String,
      },
    ],

    timeline: [
      {
        status:    String,
        note:      String,
        byUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at:        { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

replacementRequestSchema.index({ masterOrder: 1 });
replacementRequestSchema.index({ customer: 1, status: 1 });

module.exports = mongoose.model('ReplacementRequest', replacementRequestSchema);
