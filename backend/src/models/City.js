const mongoose = require('mongoose');
const slugify = require('slugify');

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    referenceNumber: { type: String, unique: true, sparse: true },
    state: { type: String, required: true, trim: true },
    /** 6-digit PIN codes where this city is serviceable (admin-managed). */
    pincodes: [{ type: String, trim: true }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isServiceable: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; } },
  }
);

citySchema.pre('save', function (next) {
  if (this.isModified('name')) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});
citySchema.pre(/^find/, function (next) { this.where({ isDeleted: false }); next(); });
citySchema.index({ status: 1, isDeleted: 1, sortOrder: 1 });

module.exports = mongoose.model('City', citySchema);
