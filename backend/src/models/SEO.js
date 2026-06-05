const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema(
  {
    // Unique page identifier — e.g. 'home', 'about', 'contact', 'blog', 'categories'
    page: { type: String, required: true, unique: true, lowercase: true, trim: true },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    keywords: [{ type: String, trim: true, lowercase: true }],
    ogTitle: { type: String, trim: true },
    ogDescription: { type: String, trim: true },
    ogImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    canonicalUrl: { type: String, trim: true, default: null },
    robotsDirective: {
      type: String,
      enum: ['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow'],
      default: 'index,follow',
    },
    schemaMarkup: { type: String, default: null }, // raw JSON-LD string
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

module.exports = mongoose.model('SEO', seoSchema);
