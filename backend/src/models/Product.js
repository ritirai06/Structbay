const mongoose = require('mongoose');
const slugify = require('slugify');

const faqSchema = new mongoose.Schema(
  { question: String, answer: String },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, trim: true, unique: true, uppercase: true },
    referenceNumber: { type: String, unique: true, sparse: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },

    shortDescription: { type: String, trim: true, maxlength: 500, default: null },
    description: { type: String, trim: true, default: null },

    images: [{ url: String, publicId: String }],
    documents: [{ name: String, url: String, publicId: String }],
    videos: [{ title: String, url: String }],
    faqs: [faqSchema],

    gstPercentage: { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },
    /** When true, storefront shows city prices including GST (admin setting per product). */
    priceIncludesGst: { type: Boolean, default: false },

    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'DRAFT' },
    isFeatured: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    isAssured: { type: Boolean, default: false },      // legacy “assured” flag (kept for backward compatibility)
    isExpress: { type: Boolean, default: false },      // legacy express / fast-track flag

    /** Explicit StructBay Assured badge (admin-verified quality program). */
    isStructbayAssured: { type: Boolean, default: false },
    assuredVerifiedAt: { type: Date, default: null },
    assuredVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    /** StructBay-managed delivery badge + logistics metadata. */
    isStructbayDelivery: { type: Boolean, default: false },
    structbayDeliverySupported: { type: Boolean, default: false },
    structbayDeliveryZones: [{ type: String, trim: true }],
    structbayDeliveryLeadTimeDays: { type: Number, default: null, min: 0 },

    displayOrder: { type: Number, default: 0 },

    seo: {
      metaTitle: { type: String, default: null },
      metaDescription: { type: String, default: null },
      metaKeywords: [String],
    },

    isDeleted: { type: Boolean, default: false, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

productSchema.virtual('displayStructbayAssured').get(function () {
  return !!(this.isStructbayAssured || this.isAssured);
});
productSchema.virtual('displayStructbayDelivery').get(function () {
  return !!(this.isStructbayDelivery || this.isExpress);
});

productSchema.pre('save', function (next) {
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});
const excludeSoftDeleted = function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
};
productSchema.pre(/^find/, excludeSoftDeleted);
productSchema.pre('countDocuments', excludeSoftDeleted);
productSchema.index({ category: 1, brand: 1, status: 1, isDeleted: 1 });
// sku: index already created by field `unique: true`

module.exports = mongoose.model('Product', productSchema);
