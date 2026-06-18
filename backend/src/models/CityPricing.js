const mongoose = require('mongoose');

const wholesaleSlabSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true },
    maxQty: { type: Number, default: null },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const cityPricingSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variation: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', default: null },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },

    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    mrp: { type: Number, default: null, min: 0 },
    purchaseCost: { type: Number, default: null, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: null, min: 0, max: 100 },

    wholesaleSlabs: [wholesaleSlabSchema],

    isVisible: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

cityPricingSchema.index({ product: 1, city: 1 }, { unique: false });
cityPricingSchema.index(
  { product: 1, variation: 1, city: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
cityPricingSchema.pre(/^find/, function (next) { this.where({ isDeleted: { $ne: true } }); next(); });
const excludeSoftDeleted = function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
};
cityPricingSchema.pre('countDocuments', excludeSoftDeleted);

module.exports = mongoose.model('CityPricing', cityPricingSchema);
