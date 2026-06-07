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

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },

    shortDescription: { type: String, trim: true, maxlength: 500, default: null },
    description: { type: String, trim: true, default: null },

    images: [{ url: String, publicId: String }],
    documents: [{ name: String, url: String, publicId: String }],
    videos: [{ title: String, url: String }],
    faqs: [faqSchema],

    gstPercentage: { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },

    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'DRAFT' },
    isFeatured: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    isAssured: { type: Boolean, default: false },      // StructBay Assured
    isExpress: { type: Boolean, default: false },      // StructBay Express

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

productSchema.pre('save', function (next) {
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});
productSchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
productSchema.index({ category: 1, brand: 1, status: 1, isDeleted: 1 });
productSchema.index({ sku: 1 });

module.exports = mongoose.model('Product', productSchema);
