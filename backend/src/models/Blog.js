const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true }, // short summary
    content: { type: String }, // rich text / HTML
    featuredImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    author: { type: String, trim: true, default: 'Structbay Team' },
    publishDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: { type: String, trim: true, default: null },
    viewCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

blogSchema.index({ status: 1, publishDate: -1 });
blogSchema.index({ tags: 1 });

blogSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.status === 'PUBLISHED' && !this.publishDate) {
    this.publishDate = new Date();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
