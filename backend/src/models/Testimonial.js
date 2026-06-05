const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    designation: { type: String, trim: true },
    company: { type: String, trim: true },
    review: { type: String, required: true, trim: true },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
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

testimonialSchema.index({ status: 1, isFeatured: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
