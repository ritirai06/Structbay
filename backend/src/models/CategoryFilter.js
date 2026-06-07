const mongoose = require('mongoose');

const categoryFilterSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    filters: [
      {
        label: { type: String, required: true, trim: true },       // "Brand", "Weight", "Grade"
        key: { type: String, required: true, trim: true, lowercase: true }, // "brand", "weight"
        type: { type: String, enum: ['SELECT', 'MULTI_SELECT', 'RANGE', 'TEXT'], default: 'MULTI_SELECT' },
        options: [{ label: String, value: String }],
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } } }
);

categoryFilterSchema.index({ category: 1 }, { unique: true });

module.exports = mongoose.model('CategoryFilter', categoryFilterSchema);
