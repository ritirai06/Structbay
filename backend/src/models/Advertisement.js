const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, default: null },
    },
    link: { type: String, trim: true, default: '#' },
    placement: {
      type: String,
      enum: ['HOME_TOP', 'HOME_MID', 'HOME_BOTTOM', 'SIDEBAR', 'CATEGORY_PAGE', 'SEARCH_PAGE'],
      required: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
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

advertisementSchema.index({ status: 1, placement: 1 });

advertisementSchema.virtual('ctr').get(function () {
  return this.impressions > 0 ? ((this.clicks / this.impressions) * 100).toFixed(2) : '0.00';
});

advertisementSchema.virtual('isLive').get(function () {
  const now = new Date();
  const afterStart = !this.startDate || this.startDate <= now;
  const beforeEnd = !this.endDate || this.endDate >= now;
  return this.status === 'ACTIVE' && afterStart && beforeEnd;
});

module.exports = mongoose.model('Advertisement', advertisementSchema);
