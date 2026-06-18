const mongoose = require('mongoose');
const slugify = require('slugify');

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: null },
    logo: { url: { type: String, default: null }, publicId: { type: String, default: null } },
    banner: { url: { type: String, default: null }, publicId: { type: String, default: null } },
    /** Parent category (e.g. Cement) — many brands per category */
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

brandSchema.pre('save', function (next) {
  if (this.isDeleted) return next();
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});
const excludeSoftDeleted = function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
};
brandSchema.pre(/^find/, excludeSoftDeleted);
brandSchema.pre('countDocuments', excludeSoftDeleted);
brandSchema.index({ status: 1, isDeleted: 1, sortOrder: 1 });
brandSchema.index({ category: 1, status: 1 });
brandSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
brandSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);

module.exports = mongoose.model('Brand', brandSchema);
