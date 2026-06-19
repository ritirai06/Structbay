const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: { type: String, lowercase: true, trim: true },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },
    listingHeadline: {
      type: String,
      trim: true,
      maxlength: [180, 'Listing headline cannot exceed 180 characters'],
      default: null,
    },
    icon: { type: String, trim: true, default: null }, // icon class or emoji
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

categorySchema.index({ status: 1, isDeleted: 1, sortOrder: 1 });
categorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
categorySchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);

categorySchema.pre('save', function (next) {
  if (this.isDeleted) return next();
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

const excludeSoftDeleted = function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
};
categorySchema.pre(/^find/, excludeSoftDeleted);
categorySchema.pre('countDocuments', excludeSoftDeleted);

module.exports = mongoose.model('Category', categorySchema);
