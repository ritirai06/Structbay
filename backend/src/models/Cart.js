const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    quantity:  { type: Number, required: true, min: 1, default: 1 },
    savedForLater: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    city:     { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    items:    [cartItemSchema],
    coupon:   { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

// customer: unique index from field definition (one cart per user)

module.exports = mongoose.model('Cart', cartSchema);
