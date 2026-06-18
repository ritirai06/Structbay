const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    /** Shown below the title on the storefront hero (sub-heading). */
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    /** Optional hex (e.g. #F5F0E6) or CSS color for hero title. */
    titleColor: { type: String, trim: true, default: null },
    /** Optional color for sub-heading / body line under title. */
    subtitleColor: { type: String, trim: true, default: null },
    /** Solid section background when no image; subtle tint when used with image. */
    backgroundColor: { type: String, trim: true, default: null },
    /** 0–100: darkness of left overlay on top of hero image (higher = more contrast for text). */
    overlayOpacity: { type: Number, min: 0, max: 100, default: null },
    /** Hero headline block alignment on the storefront carousel. */
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'right' },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    buttonText: { type: String, trim: true, default: null },
    buttonLink: { type: String, trim: true, default: '#' },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
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

bannerSchema.index({ status: 1, displayOrder: 1 });

// Virtual: isLive — banner is active and within date range
bannerSchema.virtual('isLive').get(function () {
  const now = new Date();
  const afterStart = !this.startDate || this.startDate <= now;
  const beforeEnd = !this.endDate || this.endDate >= now;
  return this.status === 'ACTIVE' && afterStart && beforeEnd;
});

module.exports = mongoose.model('Banner', bannerSchema);
