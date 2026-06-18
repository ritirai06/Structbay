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
    /** Optional: full URL to header / brand logo (admin-managed). */
    brandLogoUrl: { type: String, default: null, trim: true },
    /** Optional: hero section background image URL. */
    heroBackgroundImageUrl: { type: String, default: null, trim: true },

    /** Intro block below hero (title, tagline, body). */
    introSection: {
      title: {
        type: String,
        default: 'Smart Construction Starts With Smarter Sourcing',
        trim: true,
      },
      tagline: {
        type: String,
        default: 'Built for Contractors, Backed by Brands.',
        trim: true,
      },
      body: {
        type: String,
        default:
          'StructBay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.',
        trim: true,
      },
    },

    /** Three homepage feature cards (image + copy + CTA). */
    featureCards: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        imageUrl: { type: String, default: null, trim: true },
        imagePublicId: { type: String, default: null, trim: true },
        buttonText: { type: String, default: 'Shop Now', trim: true },
        buttonLink: { type: String, default: '/shop', trim: true },
        icon: {
          type: String,
          enum: ['box', 'lightbulb', 'shapes', 'shield', 'package', 'building'],
          default: 'box',
        },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],

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

    // ─── Announcements (short lines / links; optional marquee fallback) ─────
    announcements: [
      {
        text: { type: String, trim: true, required: true },
        linkUrl: { type: String, default: null },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date, default: null },
      },
    ],

    /**
     * Storefront promo: HomeRun-style top strip + optional hero modal (all CMS-driven).
     * Images: upload in Admin → CMS → Homepage → “Top bar & promo popup”.
     */
    storefrontPromo: {
      enabled: { type: Boolean, default: true },
      /** `center_banner` = single line (e.g. yellow bar). `marquee` = scrolling segments. */
      topBarStyle: { type: String, enum: ['center_banner', 'marquee'], default: 'center_banner' },
      topBarText: { type: String, default: '', trim: true },
      topBarBg: { type: String, default: '#FDE047', trim: true },
      topBarTextColor: { type: String, default: '#171717', trim: true },
      /** Used when topBarStyle === marquee (fallback to hardcoded segments if empty). */
      marqueeSegments: [{ type: String, trim: true }],

      modalEnabled: { type: Boolean, default: false },
      modalTitle: { type: String, default: '', trim: true },
      modalSubtitle: { type: String, default: '', trim: true },
      modalHeroImageUrl: { type: String, default: null, trim: true },
      modalHeroImagePublicId: { type: String, default: null, trim: true },
      modalBackgroundImageUrl: { type: String, default: null, trim: true },
      modalBackgroundImagePublicId: { type: String, default: null, trim: true },
      modalBadgeLeft: { type: String, default: 'Auto applied on checkout', trim: true },
      modalBadgeRight: { type: String, default: 'Minimum order value ₹500', trim: true },
      modalFooterNote: { type: String, default: 'Offer valid as per StructBay policy. T&C apply.', trim: true },
      /** After user closes modal, do not show again for this many days. */
      modalSuppressDays: { type: Number, default: 1, min: 0, max: 365 },
    },

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

    // ─── Storefront policy pages (footer quick links) ───
    policies: [
      {
        slug: { type: String, trim: true, required: true, lowercase: true },
        title: { type: String, trim: true, required: true },
        subtitle: { type: String, default: '', trim: true },
        lastUpdated: { type: String, default: '', trim: true },
        sections: [
          {
            title: { type: String, trim: true, required: true },
            body: [{ type: String, trim: true }],
          },
        ],
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],

    /** Marketing / utility landing pages (e.g. quantity calculators). */
    landingPages: [
      {
        slug: { type: String, trim: true, required: true, lowercase: true },
        title: { type: String, trim: true, required: true },
        subtitle: { type: String, default: '', trim: true },
        pageType: { type: String, enum: ['content', 'calculator'], default: 'content' },
        calculatorType: { type: String, enum: ['cement', 'none'], default: 'none' },
        sections: [
          {
            title: { type: String, trim: true, required: true },
            body: [{ type: String, trim: true }],
          },
        ],
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],

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
  const { ensureCmsDefaults } = require('../services/cmsDefaults.service');
  await ensureCmsDefaults(cms);
  return cms;
};

const CMS = mongoose.model('CMS', cmsSchema);
module.exports = CMS;
