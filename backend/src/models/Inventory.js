const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    quantity: { type: Number, required: true, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },    // locked for pending orders
    lowStockThreshold: { type: Number, default: 50 },
    safetyStock: { type: Number, default: 0, min: 0 },

    isDeleted: { type: Boolean, default: false, select: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; },
    },
  }
);

inventorySchema.virtual('available').get(function () {
  return Math.max(0, this.quantity - this.reserved);
});
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity > 0 && this.quantity <= this.lowStockThreshold;
});
inventorySchema.virtual('isOutOfStock').get(function () {
  return this.quantity === 0;
});
inventorySchema.virtual('stockStatus').get(function () {
  if (this.quantity === 0) return 'OUT_OF_STOCK';
  if (this.quantity <= this.lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
});

inventorySchema.index({ product: 1, city: 1 });
inventorySchema.index(
  { product: 1, variation: 1, city: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
inventorySchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });

module.exports = mongoose.model('Inventory', inventorySchema);
