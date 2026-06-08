const mongoose = require('mongoose');

// CMS is a singleton document — only one record exists per collection
const cmsSchema = new mongoose.Schema(
  {
    // Ensures only one CMS doc can exist
    key: {
      type: String,
      default: 'HOMEPAGE',
      unique: true,
      immutable: true,
    },

    // ─── Hero Section ──────────────────────────────────
    heroTitle: {
      type: String,
      default: 'India\'s #1 Construction Marketplace',
      trim: true,
    },
    heroSubtitle: {
      type: String,
      default: 'Source materials, find vendors, and manage projects — all in one place.',
      trim: true,
    },
    heroCtaText: {
      type: String,
      default: 'Start Procuring',
      trim: true,
    },

    // ─── Homepage Banners ──────────────────────────────
    homepageBanners: [
      {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        imageUrl: { type: String },
        imagePublicId: { type: String },
        linkUrl: { type: String, default: '#' },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],

    // ─── Featured Categories (reference by ID) ─────────
    featuredCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],

    // ─── Announcements ─────────────────────────────────
    announcements: [
      {
        text: { type: String, trim: true, required: true },
        linkUrl: { type: String, default: null },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date, default: null },
      },
    ],

    // ─── Testimonials ──────────────────────────────────
    testimonials: [
      {
        name: { type: String, trim: true, required: true },
        role: { type: String, trim: true },
        company: { type: String, trim: true },
        message: { type: String, trim: true, required: true },
        avatarUrl: { type: String, default: null },
        rating: { type: Number, min: 1, max: 5, default: 5 },
        isActive: { type: Boolean, default: true },
      },
    ],

    // ─── Blog Posts ────────────────────────────────────
    blogs: [
      {
        title: { type: String, trim: true, required: true },
        slug: { type: String, trim: true, lowercase: true },
        summary: { type: String, trim: true },
        content: { type: String },
        imageUrl: { type: String, default: null },
        imagePublicId: { type: String, default: null },
        author: { type: String, trim: true, default: 'StructBay Team' },
        isPublished: { type: Boolean, default: false },
        publishedAt: { type: Date, default: null },
      },
    ],

    // ─── SEO Metadata ──────────────────────────────────
    seo: {
      metaTitle: {
        type: String,
        default: 'StructBay - Construction Marketplace',
        trim: true,
      },
      metaDescription: {
        type: String,
        default: 'Source construction materials from verified vendors at competitive prices.',
        trim: true,
      },
      metaKeywords: {
        type: [String],
        default: ['construction materials', 'cement', 'steel', 'building supplies'],
      },
    },

    // ─── Contact Information ────────────────────────────
    contact: {
      phone: { type: String, default: null },
      email: { type: String, default: null },
      supportEmail: { type: String, default: null },
      address: { type: String, default: null },
      whatsapp: { type: String, default: null },
      mapLink: { type: String, default: null },
      workingHours: { type: String, default: null },
    },

    // ─── Footer CMS ────────────────────────────────────
    footer: {
      companyDescription: {
        type: String,
        default: "StructBay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.",
        trim: true,
      },
      address: { type: String, default: 'Vidyaranyapura, Bengaluru', trim: true },
      phone:   { type: String, default: '+91 70905 70505', trim: true },
      email:   { type: String, default: 'hello@structbay.com', trim: true },
      newsletterText: {
        type: String,
        default: 'Subscribe for exciting offers & newsletters',
        trim: true,
      },
      copyrightText: {
        type: String,
        default: '© 2026 StructBay. All Rights Reserved. Developed By HSDA Digital.',
        trim: true,
      },
      quickLinks: [
        {
          label: { type: String, trim: true, required: true },
          href:  { type: String, trim: true, required: true },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      socialLinks: {
        facebook:  { type: String, default: '#' },
        twitter:   { type: String, default: '#' },
        instagram: { type: String, default: '#' },
        linkedin:  { type: String, default: '#' },
        youtube:   { type: String, default: '#' },
      },
    },

    // ─── Vendor FAQs ────────────────────────────────────
    vendorFaqs: [
      {
        question: { type: String, trim: true, required: true },
        answer:   { type: String, trim: true, required: true },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],

    // Track who last updated
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Static method: Get or create the singleton CMS document
 */
cmsSchema.statics.getOrCreate = async function () {
  let cms = await this.findOne({ key: 'HOMEPAGE' }).populate('featuredCategories', 'name slug image');
  if (!cms) {
    cms = await this.create({ key: 'HOMEPAGE' });
  }
  return cms;
};

const CMS = mongoose.model('CMS', cmsSchema);
module.exports = CMS;
