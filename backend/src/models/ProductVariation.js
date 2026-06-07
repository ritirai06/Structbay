const mongoose = require('mongoose');
const slugify = require('slugify');

const variationSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    attributes: {
      weight: { type: String, default: null },
      grade: { type: String, default: null },
      size: { type: String, default: null },
      color: { type: String, default: null },
      finish: { type: String, default: null },
      diameter: { type: String, default: null },
      custom: [{ key: String, value: String }],
    },
    sku: { type: String, trim: true, unique: true, sparse: true, default: null },
    images: [{ url: String, publicId: String }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

variationSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });

module.exports = mongoose.model('ProductVariation', variationSchema);
