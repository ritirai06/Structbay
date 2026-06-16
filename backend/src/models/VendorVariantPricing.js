const mongoose = require('mongoose');

/**
 * Multi-vendor offer for the same sellable variant (city-agnostic list price;
 * city-level customer pricing remains on CityPricing).
 */
const vendorVariantPricingSchema = new mongoose.Schema(
  {
    vendorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariation', required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: null, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    leadTimeDays: { type: Number, default: null, min: 0 },
    moq: { type: Number, default: 1, min: 1 },
    vendorSku: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

vendorVariantPricingSchema.index({ vendorUser: 1, variant: 1 }, { unique: true });
vendorVariantPricingSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });

module.exports = mongoose.model('VendorVariantPricing', vendorVariantPricingSchema);
