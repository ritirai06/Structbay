const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
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
