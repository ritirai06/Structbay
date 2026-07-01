const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    sku: { type: String, trim: true, sparse: true, default: null },
    barcode: { type: String, trim: true, default: null },
    mrp: { type: Number, default: null, min: 0 },
    /** Optional reference weight (kg); city stock stays on Inventory. */
    weightKg: { type: Number, default: null, min: 0 },
    leadTimeDays: { type: Number, default: null, min: 0 },
    moq: { type: Number, default: 1, min: 1 },
    vendorSku: { type: String, trim: true, default: null },
    vendorPrice: { type: Number, default: null, min: 0 },
    /** Denormalized for marketplace / global search (maintained in pre-save). */
    searchText: { type: String, default: '', index: true },
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

function buildSearchText(doc) {
  const parts = [doc.sku, doc.vendorSku, doc.barcode].filter(Boolean).map(String);
  const a = doc.attributes;
  if (a && typeof a.forEach === 'function') {
    a.forEach((val) => {
      if (val) parts.push(String(val));
    });
  } else if (a && typeof a === 'object') {
    Object.values(a).forEach((val) => {
      if (val) parts.push(String(val));
    });
  }
  return parts.join(' ').toLowerCase();
}

variationSchema.pre('save', function (next) {
  this.searchText = buildSearchText(this);
  next();
});

variationSchema.index(
  { sku: 1 },
  { unique: true, sparse: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);

module.exports = mongoose.model('ProductVariation', variationSchema);
