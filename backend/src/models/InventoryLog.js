const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    type: {
      type: String,
      enum: ['ADD', 'DEDUCT', 'ADJUST', 'RESERVED', 'RELEASED'],
      required: true,
    },
    quantity: { type: Number, required: true },     // +/- delta
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },

    reason: { type: String, trim: true, default: null },
    referenceId: { type: String, default: null },   // order ID, adjustment ID, etc.

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

inventoryLogSchema.index({ inventory: 1, createdAt: -1 });
inventoryLogSchema.index({ product: 1, city: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
