const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    attributes: {
      weight: { type: String, default: null },
      grade: { type: String, default: null },
      size: { type: String, default: null },
      thickness: { type: String, default: null },
      length: { type: String, default: null },
      color: { type: String, default: null },
      finish: { type: String, default: null },
      diameter: { type: String, default: null },
      custom: [{ key: String, value: String }],
    },
    sku: { type: String, trim: true, unique: true, sparse: true, default: null },
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
  const parts = [doc.sku, doc.vendorSku].filter(Boolean).map(String);
  const a = doc.attributes || {};
  ['weight', 'grade', 'size', 'thickness', 'length', 'color', 'finish', 'diameter'].forEach((k) => {
    if (a[k]) parts.push(String(a[k]));
  });
  (a.custom || []).forEach((c) => {
    if (c?.value) parts.push(String(c.value));
    if (c?.key) parts.push(String(c.key));
  });
  return parts.join(' ').toLowerCase();
}

variationSchema.pre('save', function (next) {
  this.searchText = buildSearchText(this);
  next();
});

module.exports = mongoose.model('ProductVariation', variationSchema);
